import { Router } from 'express';
import { query } from '../models/db.js';
import { authenticate } from '../middleware/auth.js';
import { sendNow, scheduleMessage, getBurstLimit } from '../services/messageService.js';
import { checkBurst } from '../services/burstLimit.js';
import { publishRealtime } from '../services/realtime.js';

const router = Router();
router.use(authenticate);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---- Contacts ----
router.get('/', asyncRoute(async (req, res) => {
  const q = (req.query.q || '').toString().trim().toLowerCase();
  const params = [req.user.id];
  let where = `WHERE c.user_id = $1`;
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.company ILIKE $${params.length})`;
  }
  const { rows } = await query(
    `SELECT c.*,
       COALESCE(ARRAY_AGG(DISTINCT g.id) FILTER (WHERE g.id IS NOT NULL), '{}') AS group_ids,
       COALESCE(ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS group_names,
       (SELECT COUNT(*) FROM messages m JOIN conversations cv ON cv.id = m.conversation_id
         WHERE cv.user_id = c.user_id AND cv.contact_number = c.phone)::int AS msg_count
     FROM contacts c
     LEFT JOIN contact_group_members cgm ON cgm.contact_id = c.id
     LEFT JOIN contact_groups g ON g.id = cgm.group_id
     ${where}
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    params
  );
  res.json({ contacts: rows });
}));

router.post('/', asyncRoute(async (req, res) => {
  const { name, phone, email, company, notes, groups } = req.body;
  if (!phone || !String(phone).trim()) return res.status(400).json({ error: 'Phone number is required' });
  const cleanPhone = String(phone).trim();
  const { rows: dup } = await query(
    'SELECT id FROM contacts WHERE user_id = $1 AND phone = $2',
    [req.user.id, cleanPhone]
  );
  if (dup.length) return res.status(400).json({ error: 'A contact with this number already exists' });

  const { rows } = await query(
    `INSERT INTO contacts (user_id, name, phone, email, company, notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user.id, (name || '').trim(), cleanPhone, (email || '').trim(), (company || '').trim(), notes || null]
  );
  const contact = rows[0];

  if (Array.isArray(groups) && groups.length) {
    const ids = [...new Set(groups.map((g) => String(g)))];
    const { rows: owned } = await query(
      'SELECT id FROM contact_groups WHERE user_id = $1 AND id = ANY($2)',
      [req.user.id, ids]
    );
    for (const g of owned) {
      await query(
        'INSERT INTO contact_group_members (contact_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [contact.id, g.id]
      );
    }
  }
  res.status(201).json({ contact });
}));

router.put('/:id', asyncRoute(async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Contact not found' });
  const { name, phone, email, company, notes, groups } = req.body;
  const { rows } = await query(
    `UPDATE contacts SET
       name = COALESCE($2, name),
       phone = COALESCE($3, phone),
       email = COALESCE($4, email),
       company = COALESCE($5, company),
       notes = COALESCE($6, notes)
     WHERE id = $1 AND user_id = $7 RETURNING *`,
    [req.params.id, name ?? null, phone ? String(phone).trim() : null, email ?? null, company ?? null, notes ?? null, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Contact not found' });

  if (Array.isArray(groups)) {
    await query('DELETE FROM contact_group_members WHERE contact_id = $1', [req.params.id]);
    const ids = [...new Set(groups.map((g) => String(g)))];
    if (ids.length) {
      const { rows: owned } = await query(
        'SELECT id FROM contact_groups WHERE user_id = $1 AND id = ANY($2)',
        [req.user.id, ids]
      );
      for (const g of owned) {
        await query(
          'INSERT INTO contact_group_members (contact_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [req.params.id, g.id]
        );
      }
    }
  }
  res.json({ contact: rows[0] });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Contact not found' });
  const { rows } = await query(
    'DELETE FROM contacts WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Contact not found' });
  res.json({ ok: true });
}));

// ---- Groups ----
router.get('/groups', asyncRoute(async (req, res) => {
  const { rows } = await query(
    `SELECT g.id, g.name, g.created_at,
       (SELECT COUNT(*) FROM contact_group_members cgm WHERE cgm.group_id = g.id)::int AS member_count
     FROM contact_groups g
     WHERE g.user_id = $1
     ORDER BY g.created_at DESC`,
    [req.user.id]
  );
  res.json({ groups: rows });
}));

router.post('/groups', asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Group name is required' });
  const { rows } = await query(
    'INSERT INTO contact_groups (user_id, name) VALUES ($1,$2) RETURNING *',
    [req.user.id, name]
  );
  res.status(201).json({ group: { ...rows[0], member_count: 0 } });
}));

router.delete('/groups/:id', asyncRoute(async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Group not found' });
  const { rows } = await query(
    'DELETE FROM contact_groups WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Group not found' });
  res.json({ ok: true });
}));

router.post('/groups/:id/members', asyncRoute(async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Group not found' });
  const { contactIds } = req.body;
  if (!Array.isArray(contactIds) || !contactIds.length) return res.status(400).json({ error: 'contactIds required' });
  const ids = [...new Set(contactIds.map((c) => String(c)))];
  const { rows: owned } = await query(
    'SELECT id FROM contacts WHERE user_id = $1 AND id = ANY($2)',
    [req.user.id, ids]
  );
  for (const c of owned) {
    await query(
      'INSERT INTO contact_group_members (contact_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [c.id, req.params.id]
    );
  }
  res.json({ ok: true, added: owned.length });
}));

// ---- Import (CSV) ----
router.post('/import', asyncRoute(async (req, res) => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts) || !contacts.length) {
    return res.status(400).json({ error: 'Provide at least one contact row' });
  }
  if (contacts.length > 500) return res.status(400).json({ error: 'Max 500 contacts per import' });

  let added = 0, skipped = 0;
  const seen = new Set();
  for (const row of contacts) {
    const phone = String(row.phone || row.number || '').replace(/[\s-]/g, '');
    if (!phone) { skipped++; continue; }
    const name = String(row.name || row.full_name || '').trim();
    const email = String(row.email || '').trim();
    const company = String(row.company || '').trim();
    if (seen.has(phone)) { skipped++; continue; }
    seen.add(phone);
    const { rows: dup } = await query(
      'SELECT id FROM contacts WHERE user_id = $1 AND phone = $2',
      [req.user.id, phone]
    );
    if (dup.length) { skipped++; continue; }
    await query(
      'INSERT INTO contacts (user_id, name, phone, email, company) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, name, phone, email || null, company || null]
    );
    added++;
  }
  res.status(201).json({ added, skipped });
}));

// ---- Group blast (reuses SMS send pipeline) ----
router.post('/groups/:id/blast', asyncRoute(async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Group not found' });
  const { body, fromNumberId, scheduledAt } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'Provide a message body' });
  if (!fromNumberId) return res.status(400).json({ error: 'fromNumberId required' });

  const { rows: numberRows } = await query(
    'SELECT id, number FROM numbers WHERE id = $1 AND assigned_user_id = $2',
    [fromNumberId, req.user.id]
  );
  if (!numberRows.length) return res.status(400).json({ error: 'Number not assigned to you' });

  const { rows: members } = await query(
    `SELECT c.phone FROM contact_group_members cgm
     JOIN contacts c ON c.id = cgm.contact_id
     JOIN contact_groups g ON g.id = cgm.group_id
     WHERE g.user_id = $1 AND g.id = $2`,
    [req.user.id, req.params.id]
  );
  const recipients = [...new Set(members.map((m) => m.phone))];
  if (!recipients.length) return res.status(400).json({ error: 'Group has no contacts' });
  if (recipients.length > 100) return res.status(400).json({ error: 'Max 100 recipients per blast' });

  const burstLimit = await getBurstLimit();
  const burst = checkBurst(req.user.id, burstLimit);
  if (!burst.allowed) {
    return res.status(429).json({ error: 'Too many messages, slow down', retryAfterMs: Math.max(burst.retryAfterMs, 100) });
  }

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  if (scheduledDate && isNaN(scheduledDate.getTime())) return res.status(400).json({ error: 'Invalid scheduledAt' });

  const results = [];
  let sent = 0, failed = 0, scheduled = 0;

  for (const contact of recipients) {
    try {
      const { rows: conv } = await query(
        `INSERT INTO conversations (user_id, number_id, contact_number)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, number_id, contact_number) DO UPDATE SET archived = FALSE, updated_at = NOW()
         RETURNING id`,
        [req.user.id, numberRows[0].id, contact]
      );
      const conversationId = conv[0].id;

      if (scheduledDate) {
        const messageId = await scheduleMessage({ userId: req.user.id, conversationId, body, scheduledAt: scheduledDate.toISOString(), mediaUrl: null });
        scheduled++;
        results.push({ to: contact, status: 'scheduled', messageId });
      } else {
        const { rows: msg } = await query(
          `INSERT INTO messages (conversation_id, direction, body, status, cost, media_url)
           SELECT $1, 'out', $2, 'pending', COALESCE((SELECT (value->>'rate')::numeric FROM settings WHERE key = 'sms_rate'), 0.0079), NULL
           RETURNING id, created_at`,
          [conversationId, body]
        );
        publishRealtime(req.user.id, {
          type: 'message.created',
          conversationId,
          message: { id: msg[0].id, direction: 'out', body, status: 'pending', media_url: null, created_at: msg[0].created_at },
        });
        await sendNow({ userId: req.user.id, numberId: numberRows[0].id, conversationId, contactNumber: contact, body, messageId: msg[0].id, mediaUrl: null });
        sent++;
        results.push({ to: contact, status: 'sent', messageId: msg[0].id });
      }
    } catch (err) {
      failed++;
      results.push({ to: contact, status: 'failed', error: err.message });
    }
  }

  res.status(201).json({ total: recipients.length, sent, scheduled, failed, results });
}));

export default router;
