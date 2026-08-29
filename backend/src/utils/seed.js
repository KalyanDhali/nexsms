import { query } from '../models/db.js';
import { hashPassword } from '../utils/password.js';

async function seed() {
  const adminPass = await hashPassword('NexSMS@Admin2026');

  await query(
    `INSERT INTO users (email, password, name, role, status)
     VALUES ($1, $2, $3, 'admin', 'active')
     ON CONFLICT (email) DO NOTHING`,
    ['admin@nexsms.app', adminPass, 'NexSMS Admin']
  );

  const plans = [
    ['Starter', 'starter', 10, 1000, 50, 'For one user getting started', JSON.stringify(['1 number', '1000 SMS/month', 'Unlimited US texting', '24/7 support']), 1],
    ['Standard', 'standard', 20, 5000, 200, 'For growing teams', JSON.stringify(['Up to 10 numbers', '5000 SMS/month', 'Voicemail transcription', 'Priority support']), 2],
    ['Premier', 'premier', 30, 15000, 1000, 'For organizations', JSON.stringify(['Unlimited numbers', '15000 SMS/month', 'Advanced reporting', 'Dedicated support']), 3],
  ];

  for (const p of plans) {
    await query(
      `INSERT INTO plans (name, slug, price, sms_quota, daily_limit_per_number, description, features, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (slug) DO NOTHING`,
      p
    );
  }

  const templates = [
    ['OTP verification', 'otp', 'Your NexSMS verification code is {{code}}. It expires in 10 minutes.'],
    ['Welcome', 'welcome', 'Welcome to NexSMS! Your account is ready. Get started at {{url}}.'],
    ['Payment received', 'payment', 'Thank you! Your payment of {{amount}} has been received.'],
    ['Appointment reminder', 'reminder', 'Reminder: You have an appointment on {{date}}. Reply C to confirm.'],
    ['Delivery notification', 'notification', 'Your order has been shipped. Tracking: {{tracking}}.'],
  ];
  for (const [name, category, body] of templates) {
    await query(
      `INSERT INTO templates (name, category, body, user_id)
       VALUES ($1,$2,$3,NULL) ON CONFLICT DO NOTHING`,
      [name, category, body]
    );
  }

  const settings = [
    ['site_name', JSON.stringify({ value: 'NexSMS' })],
    ['theme', JSON.stringify({ primaryColor: '#4F46E5', secondaryColor: '#7C3AED', font: 'Inter', logo: '' })],
    ['billing', JSON.stringify({ prepaid: true, subscription: true, hybrid: false, quotaExhausted: 'block' })],
    ['currency', JSON.stringify({ base: 'USD', rates: { USDT: 1, BTC: 0.000015 } })],
    ['sms_rate', JSON.stringify({ rate: 0.0079 })],
    ['pay_per_sms_limit', JSON.stringify({ daily: 50 })],
    ['burst_limit', JSON.stringify({ perSecond: 3 })],
  ];

  for (const [key, value] of settings) {
    await query(
      `INSERT INTO settings (key, value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO NOTHING`,
      [key, value]
    );
  }

  const toggles = [
    ['kyc', true, {}], ['referral', false, { bonusPercent: 5 }], ['multi_currency', true, {}],
    ['fraud_flash_usdt', true, {}], ['fraud_carding', true, {}], ['risk_scoring', true, {}],
    ['payment_hold', true, { threshold: 100 }], ['ip_blocklist', true, {}], ['message_filter', true, {}],
    ['number_expiry', true, { graceDays: 7 }], ['maintenance_mode', false, {}], ['admin_alerts', true, {}],
    ['bulk_blast', true, {}], ['ai_features', true, {}], ['user_api', true, {}],
    ['sms_scheduling', true, {}], ['mm_support', false, {}], ['kyc_required', false, {}],
    ['self_assign', true, {}], ['admin_ip_whitelist', false, {}],
    ['did_store', true, {}],
  ];

  for (const [key, enabled, cfg] of toggles) {
    await query(
      `INSERT INTO feature_toggles (key, enabled, config) VALUES ($1,$2,$3::jsonb) ON CONFLICT (key) DO NOTHING`,
      [key, enabled, JSON.stringify(cfg)]
    );
  }

  const gateways = [
    ['Binance Pay', 'binance', 'api', { enabled: false }, 0, 1],
    ['Bybit', 'bybit', 'api', { enabled: false }, 0, 2],
    ['Stripe', 'stripe', 'api', { enabled: false }, 2.9, 3],
    ['Cryptomus', 'cryptomus', 'api', { enabled: false }, 1, 4],
    ['TRC20 (USDT)', 'trc20', 'wallet', { enabled: false }, 0, 5],
    ['BEP20 (USDT)', 'bep20', 'wallet', { enabled: false }, 0, 6],
    ['BTC', 'btc', 'wallet', { enabled: false }, 0, 7],
    ['BenlyPay', 'benlypay', 'api', { enabled: false }, 0, 8],
  ];

  for (const [name, slug, type, creds, fee, priority] of gateways) {
    const wallet =
      type === 'wallet'
        ? {
            trc20: 'TRiVcUS2bV2RgQRWmQyLwv8QgXn1QmDQYq',
            bep20: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
            btc: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          }[slug]
        : null;
    await query(
      `INSERT INTO payment_gateways (name, slug, type, credentials, fee_percent, priority, wallet_address)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7)
       ON CONFLICT (slug) DO UPDATE SET
         wallet_address = COALESCE(payment_gateways.wallet_address, EXCLUDED.wallet_address),
         fee_percent = COALESCE(payment_gateways.fee_percent, EXCLUDED.fee_percent)`,
      [name, slug, type, JSON.stringify(creds), fee, priority, wallet]
    );
  }

  console.log('Seed data inserted successfully');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
