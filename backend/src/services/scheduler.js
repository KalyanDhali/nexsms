import { query } from '../models/db.js';
import { sendNow } from './messageService.js';
import { publishRealtime } from './realtime.js';

/**
 * Background scheduler that delivers scheduled SMS.
 * Runs every SCHEDULER_INTERVAL_MS and picks up messages whose
 * scheduled_at has arrived. Uses the same sendNow pipeline as the
 * send route so limits / costs / failover behave identically.
 */

let timer = null;
const SCHEDULER_INTERVAL_MS = 5000;
const isSchedulerRunning = { flag: false };

export function initScheduler() {
  if (timer) return;
  timer = setInterval(runScheduler, SCHEDULER_INTERVAL_MS);
  console.log('[scheduler] started (interval 5s)');
  runScheduler();
}

export function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

async function runScheduler() {
  if (isSchedulerRunning.flag) return; // avoid overlapping runs
  isSchedulerRunning.flag = true;
  try {
    await runNumberExpiry();
    await runScheduledMessages();
  } catch (err) {
    console.error('[scheduler] run error:', err.message);
  } finally {
    isSchedulerRunning.flag = false;
  }
}

/**
 * Reclaim numbers whose expires_at (plus admin grace days) has passed.
 * Gated by the number_expiry toggle. Resets ownership so the number
 * returns to the available pool.
 */
async function runNumberExpiry() {
  const { rows } = await query(`SELECT enabled, config FROM feature_toggles WHERE key = 'number_expiry'`);
  if (!rows.length || !rows[0].enabled) return;
  const graceDays = Number(rows[0].config?.graceDays || 7);

  const { rows: expired } = await query(
    `SELECT id, number, assigned_user_id FROM numbers
     WHERE status = 'assigned' AND expires_at IS NOT NULL
       AND expires_at + ($1 || ' days')::interval < NOW()`,
    [graceDays]
  );
  for (const num of expired) {
    await query(
      `UPDATE numbers SET status = 'available', assigned_user_id = NULL,
              primary_number = FALSE, updated_at = NOW()
       WHERE id = $1`,
      [num.id]
    );
    console.log(`[scheduler] number ${num.number} reclaimed after expiry`);
    await query(
      `UPDATE conversations SET archived = TRUE, updated_at = NOW()
       WHERE number_id = $1 AND user_id = $2`,
      [num.id, num.assigned_user_id]
    );
  }
}

async function runScheduledMessages() {
  const { rows } = await query(
    `SELECT m.id, m.conversation_id, m.body, c.number_id, c.contact_number, c.user_id
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE m.status = 'scheduled' AND m.scheduled_at <= NOW()
     ORDER BY m.scheduled_at ASC
     LIMIT 50`
  );

  for (const msg of rows) {
    try {
      await sendNow({
        userId: msg.user_id,
        numberId: msg.number_id,
        conversationId: msg.conversation_id,
        contactNumber: msg.contact_number,
        body: msg.body,
        messageId: msg.id,
      });
    } catch (err) {
      console.error(`[scheduler] failed to send scheduled message ${msg.id}:`, err.message);
      await query(
        `UPDATE messages SET status = 'failed', error = $2 WHERE id = $1`,
        [msg.id, err.message]
      );
      publishRealtime(msg.user_id, {
        type: 'message.updated',
        conversationId: msg.conversation_id,
        message: { id: msg.id, status: 'failed', error: err.message },
      });
    }
  }
}
