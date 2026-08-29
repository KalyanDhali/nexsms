import crypto from 'node:crypto';
import { BaseProvider } from './base.js';

/**
 * Simulator provider — a local "no-carrier" gateway for demos and
 * development. Sends complete instantly without any external network
 * call and return a synthetic SID, so the full send/status/accounting
 * pipeline can be exercised end-to-end. Health checks always pass.
 *
 * The provider name is recorded on the message row so it stays obvious
 * that the send went through the simulator and not a real carrier.
 */
export default class SimulatorProvider extends BaseProvider {
  async sendSms({ from, to, body }) {
    const sid = 'SM' + crypto.randomBytes(16).toString('hex').toUpperCase();
    return { sid, status: 'sent' };
  }

  async checkNumber(number) {
    return { valid: true, number };
  }

  async buyNumber() {
    return { error: 'Simulator provider does not provision numbers' };
  }

  async parseInbound() {
    return null;
  }

  async parseStatus() {
    return null;
  }

  async healthCheck() {
    return true;
  }
}
