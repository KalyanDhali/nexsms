import crypto from 'crypto';
import { BaseProvider } from './base.js';

/**
 * Telnyx adapter.
 * Credentials: { apiKey }  (public_key optional for webhook signature)
 */
export default class TelnyxProvider extends BaseProvider {
  get baseUrl() {
    return 'https://api.telnyx.com/v2';
  }

  get auth() {
    return 'Bearer ' + this.credentials.apiKey;
  }

  async request(path, opts = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...opts,
      headers: { Authorization: this.auth, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Telnyx error ${res.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  }

  async sendSms({ from, to, body }) {
    const data = await this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ from, to, text: body }),
    });
    const msg = data?.data;
    return { sid: msg?.id, status: 'queued' };
  }

  async checkNumber(number) {
    try {
      const data = await this.request(`/phone_numbers/${encodeURIComponent(number)}`);
      return data?.data ? { valid: true, number: data.data.phone_number } : { valid: false };
    } catch {
      return { valid: false };
    }
  }

  async buyNumber({ countryCode = 'US', areaCode } = {}) {
    const q = new URLSearchParams({ 'filter[country_code]': countryCode });
    const data = await this.request('/available_phone_numbers?' + q.toString());
    const candidates = data?.data || [];
    if (!candidates.length) return { error: 'No numbers available' };
    const chosen = areaCode ? candidates.find((n) => n.phone_number.startsWith('+' + areaCode)) : candidates[0];
    if (!chosen) return { error: 'No number matching area code' };
    const bought = await this.request('/phone_numbers', {
      method: 'POST',
      body: JSON.stringify({ phone_number: chosen.phone_number }),
    });
    return { number: bought?.data?.phone_number || chosen.phone_number, sid: bought?.data?.id };
  }

  async parseInbound(req) {
    const { data } = req.body || {};
    if (!data) return null;
    const event = data.event_type || '';
    const payload = data.payload || {};
    if (event !== 'message.received') return null;
    return {
      to: payload.to?.[0]?.phone_number,
      from: payload.from?.phone_number,
      body: payload.text,
      sid: payload.id,
    };
  }

  async parseStatus(req) {
    const { data } = req.body || {};
    if (!data) return null;
    const event = data.event_type || '';
    const payload = data.payload || {};
    if (event !== 'message.sent' && event !== 'message.delivered' && event !== 'message.failed') return null;
    const statusMap = { 'message.sent': 'sent', 'message.delivered': 'delivered', 'message.failed': 'failed' };
    return { sid: payload.id, status: statusMap[event], error: payload.errors?.[0]?.detail };
  }

  async healthCheck() {
    const data = await this.request('/balance');
    return !!(data && data.data);
  }
}
