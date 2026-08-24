import crypto from 'crypto';
import { BaseProvider } from './base.js';

/**
 * Twilio adapter.
 * Credentials: { accountSid, authToken }
 */
export default class TwilioProvider extends BaseProvider {
  get baseUrl() {
    return `https://api.twilio.com/2010-04-01/Accounts/${this.credentials.accountSid}`;
  }

  get auth() {
    return 'Basic ' + Buffer.from(`${this.credentials.accountSid}:${this.credentials.authToken}`).toString('base64');
  }

  async request(path, opts = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...opts,
      headers: {
        Authorization: this.auth,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(opts.headers || {}),
      },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Twilio error ${res.status}: ${text.slice(0, 300)}`);
    }
    return text ? JSON.parse(text) : null;
  }

  async sendSms({ from, to, body }) {
    const bodyParams = new URLSearchParams({ From: from, To: to, Body: body, StatusCallback: process.env.SMS_STATUS_WEBHOOK || '' });
    const data = await this.request('/Messages.json', {
      method: 'POST',
      body: bodyParams,
    });
    return { sid: data.sid, status: data.status };
  }

  async checkNumber(number) {
    const data = await this.request(`/PhoneNumbers/${encodeURIComponent(number)}.json`);
    return data ? { valid: true, number: data.phoneNumber, capability: data.capabilities } : { valid: false };
  }

  async buyNumber({ countryCode = 'US', areaCode } = {}) {
    const params = new URLSearchParams({ CountryCode: countryCode });
    if (areaCode) params.append('AreaCode', areaCode);
    const data = await this.request('/AvailablePhoneNumbers.json', { method: 'GET' });
    const candidates = data?.available_phone_numbers || [];
    if (!candidates.length) return { error: 'No numbers available' };
    const chosen = areaCode ? candidates.find((n) => n.phoneNumber.includes(`(${areaCode})`)) : candidates[0];
    if (!chosen) return { error: 'No number matching area code' };
    const purchase = await this.request('/IncomingPhoneNumbers.json', {
      method: 'POST',
      body: new URLSearchParams({ PhoneNumber: chosen.phoneNumber, VoiceEnabled: 'false', SmsEnabled: 'true' }),
    });
    return { number: purchase.phoneNumber, sid: purchase.sid };
  }

  async parseInbound(req) {
    const { From, To, Body, MessageSid } = req.body || {};
    if (!From || !Body) return null;
    const twilioSignature = req.headers['x-twilio-signature'];
    const url = req.protocol + '://' + req.get('host') + req.originalUrl;
    const fullUrl = new URL(url);
    for (const [k, v] of Object.entries(req.body || {})) fullUrl.searchParams.set(k, v);
    const expected = crypto
      .createHmac('sha1', this.credentials.authToken)
      .update(fullUrl.toString())
      .digest('base64');
    if (twilioSignature && !crypto.timingSafeEqual(Buffer.from(twilioSignature), Buffer.from(expected))) {
      return null;
    }
    return { to: To, from: From, body: Body, sid: MessageSid };
  }

  async parseStatus(req) {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body || {};
    if (!MessageSid) return null;
    const statusMap = {
      queued: 'queued', sending: 'sending', sent: 'sent', delivered: 'delivered',
      undelivered: 'failed', failed: 'failed',
    };
    return { sid: MessageSid, status: statusMap[MessageStatus] || MessageStatus, error: ErrorMessage || (ErrorCode ? `code ${ErrorCode}` : undefined) };
  }

  async healthCheck() {
    const data = await this.request('/Account.json');
    return data?.status === 'active';
  }
}
