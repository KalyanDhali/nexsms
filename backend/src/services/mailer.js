import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

let transporter = null;

function getTransporter() {
  const { host, user } = config.smtp;
  if (!host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: user ? { user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[MAIL] SMTP not configured — would send to ${to}:\n  Subject: ${subject}\n  ${text}`);
    return { delivered: false };
  }
  const from = config.smtp.from || config.smtp.user || 'NexSMS <no-reply@nexsms.app>';
  await t.sendMail({ from, to, subject, text, html });
  return { delivered: true };
}

export async function sendOtpCode(to, code) {
  const subject = 'NexSMS verification code';
  const text = `Your NexSMS verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nIf you did not request this, please ignore this email.`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="color:#1a73e8;margin:0 0 8px">NexSMS</h2>
      <p style="color:#334155;margin:0 0 16px">Your verification code is:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#202124;background:#f1f3f4;border-radius:8px;padding:12px;text-align:center">${code}</div>
      <p style="color:#64748b;font-size:12px;margin:16px 0 0">This code expires in 10 minutes. Do not share it with anyone.</p>
    </div>`;
  return sendMail({ to, subject, text, html });
}
