import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import authRoutes from './routes/auth.js';
import providerRoutes from './routes/providers.js';
import webhookRoutes from './routes/webhooks.js';
import messageRoutes from './routes/messages.js';
import numberRoutes from './routes/numbers.js';
import planRoutes from './routes/plans.js';
import billingRoutes from './routes/billing.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import apiKeyRoutes from './routes/apiKeys.js';
import apiV1Routes from './routes/apiV1.js';
import kycRoutes from './routes/kyc.js';
import templateRoutes from './routes/templates.js';
import aiRoutes from './routes/ai.js';
import userWebhookRoutes from './routes/userWebhooks.js';
import uploadRoutes from './routes/uploads.js';
import realtimeRoutes from './routes/realtime.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', true);

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'nexsms-backend', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/numbers', numberRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/v1', apiV1Routes);
app.use('/api/kyc', kycRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/user-webhooks', userWebhookRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/media', express.static(path.join(__dirname, '..', 'uploads')));

// Public landing-page stats
app.get('/api/public/stats', async (req, res) => {
  try {
    const { query } = await import('./models/db.js');
    const [avail, providers, sent, users] = await Promise.all([
      query(`SELECT COUNT(*)::int AS c FROM numbers WHERE status = 'available'`),
      query(`SELECT COUNT(*)::int AS c FROM providers WHERE active = TRUE`),
      query(`SELECT COUNT(*)::int AS c FROM messages WHERE status IN ('sent','delivered')`),
      query(`SELECT COUNT(*)::int AS c FROM users WHERE role = 'user'`),
    ]);
    res.json({
      availableNumbers: avail.rows[0].c,
      activeProviders: providers.rows[0].c,
      messagesSent: sent.rows[0].c,
      users: users.rows[0].c,
    });
  } catch (err) {
    console.error('public stats error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public settings (theme, site name) for the frontend
app.get('/api/settings/public', async (req, res) => {
  try {
    const { query } = await import('./models/db.js');
    const { rows } = await query(`SELECT key, value FROM settings WHERE key IN ('theme','site_name')`);
    const out = {};
    for (const r of rows) {
      if (r.key === 'theme') out.theme = r.value;
      if (r.key === 'site_name') out.siteName = r.value?.value || 'NexSMS';
    }
    res.json(out);
  } catch {
    res.json({});
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
