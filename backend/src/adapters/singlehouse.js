import crypto from 'crypto';
import { BaseProvider } from './base.js';

/**
 * SingleHouse adapter.
 * Credentials: { apiKey, secretKey, baseUrl }
 * SingleHouse exposes a generic REST messaging API. The base URL is
 * configurable via credentials so the admin can point it at their
 * SingleHouse dashboard endpoint.
 */
export default class SingleHouseProvider extends BaseProvider {
  get baseUrl() {
    return (this.credentials.baseUrl || 'https://api.singlehouse.io/v1').replace(/\/$/, '');
  }

  get auth() {
    return 'Bearer ' + (this.credentials.apiKey || '');
  }

  async request(path, opts = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...opts,
      headers: { Authorization: this.auth, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`SingleHouse error ${res.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  }

  async sendSms({ from, to, body }) {
    const data = await this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ from, to, body }),
    });
    return { sid: data?.id || data?.message_id || data?.sid, status: 'queued' };
  }

  async checkNumber(number) {
    try {
      const data = await this.request(`/numbers/${encodeURIComponent(number)}`);
      return data?.available ? { valid: true, number } : { valid: false };
    } catch {
      return { valid: false };
    }
  }

  async buyNumber({ countryCode = 'US', areaCode } = {}) {
    const data = await this.request(`/numbers/search?country=${countryCode}${areaCode ? `&area=${areaCode}` : ''}`);
    const candidates = data?.numbers || data?.data || [];
    if (!candidates.length) return { error: 'No numbers available' };
    const chosen = candidates[0];
    const number = chosen.number || chosen.phone_number;
    const bought = await this.request('/numbers', {
      method: 'POST',
      body: JSON.stringify({ number }),
    });
    return { number: bought?.number || number, sid: bought?.id };
  }

  async parseInbound(req) {
    const body = req.body || {};
    const from = body.from || body.source;
    const text = body.body || body.text || body.content;
    if (!from || !text) return null;
    return { to: body.to || body.destination, from, body: text, sid: body.id || body.message_id };
  }

  async parseStatus(req) {
    const body = req.body || {};
    if (!body.id && !body.message_id) return null;
    return { sid: body.id || body.message_id, status: body.status || body.message_status, error: body.error };
  }

  async healthCheck() {
    const data = await this.request('/health');
    return !!(data && (data.status === 'ok' || data.ok));
  }
}
