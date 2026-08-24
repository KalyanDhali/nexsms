import crypto from 'crypto';
import { BaseProvider } from './base.js';

/**
 * Plivo adapter.
 * Credentials: { authId, authToken }
 */
export default class PlivoProvider extends BaseProvider {
  get baseUrl() {
    return 'https://api.plivo.com/v1/Account/' + this.credentials.authId;
  }

  get auth() {
    return 'Basic ' + Buffer.from(`${this.credentials.authId}:${this.credentials.authToken}`).toString('base64');
  }

  async request(path, opts = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...opts,
      headers: { Authorization: this.auth, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Plivo error ${res.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  }

  async sendSms({ from, to, body }) {
    const data = await this.request('/Message/', {
      method: 'POST',
      body: JSON.stringify({ src: from, dst: to, text: body, url: process.env.SMS_STATUS_WEBHOOK || '' }),
    });
    return { sid: data.message_uuid?.[0] || data.api_id, status: 'queued' };
  }

  async checkNumber(number) {
    try {
      const data = await this.request(`/Number/${encodeURIComponent(number)}/`);
      return data ? { valid: true, number: data.number } : { valid: false };
    } catch {
      return { valid: false };
    }
  }

  async buyNumber({ countryCode = 'US', areaCode } = {}) {
    const q = new URLSearchParams({ country_iso: countryCode, type: 'local' });
    if (areaCode) q.append('prefix', areaCode);
    const data = await this.request('/PhoneNumber/?' + q.toString());
    const candidates = data?.objects || [];
    if (!candidates.length) return { error: 'No numbers available' };
    const chosen = candidates[0];
    const bought = await this.request('/PhoneNumber/' + encodeURIComponent(chosen.number) + '/', { method: 'POST' });
    return { number: bought.number || chosen.number, sid: bought.api_id };
  }

  async parseInbound(req) {
    const { To, From, Text, MessageUUID } = req.body || {};
    if (!From || !Text) return null;
    return { to: To, from: From, body: Text, sid: MessageUUID };
  }

  async parseStatus(req) {
    const { MessageUUID, Status, ErrorCode, Error } = req.body || {};
    if (!MessageUUID) return null;
    return { sid: MessageUUID, status: Status || 'sent', error: Error || (ErrorCode ? `code ${ErrorCode}` : undefined) };
  }

  async healthCheck() {
    const data = await this.request('/');
    return !!(data && data.api_id);
  }
}
