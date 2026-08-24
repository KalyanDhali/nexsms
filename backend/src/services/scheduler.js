import { query } from '../models/db.js';
import { sendNow } from './messageService.js';

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
      }
    }
  } catch (err) {
    console.error('[scheduler] run error:', err.message);
  } finally {
    isSchedulerRunning.flag = false;
  }
}
