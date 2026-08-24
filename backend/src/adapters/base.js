/**
 * Base provider adapter interface.
 * Every provider adapter must implement the same interface so the
 * provider layer can swap providers transparently.
 */
export class BaseProvider {
  constructor({ id, name, type, credentials }) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.credentials = credentials || {};
  }

  /**
   * Send an SMS message.
   * @param {{from: string, to: string, body: string}} message
   * @returns {Promise<{sid: string, status: string}>}
   */
  async sendSms() {
    throw new Error('sendSms not implemented');
  }

  /**
   * Check whether a phone number can be used on this provider.
   * @param {string} number
   */
  async checkNumber() {
    throw new Error('checkNumber not implemented');
  }

  /**
   * Purchase / provision a number from this provider.
   */
  async buyNumber() {
    throw new Error('buyNumber not implemented');
  }

  /**
   * Validate an incoming webhook request and normalize it.
   * @param {express.Request} req
   * @returns {Promise<{to: string, from: string, body: string, sid: string}>|null}
   */
  async parseInbound() {
    throw new Error('parseInbound not implemented');
  }

  /**
   * Validate a delivery-status webhook request.
   * @returns {Promise<{sid: string, status: string, error?: string}>|null}
   */
  async parseStatus() {
    throw new Error('parseStatus not implemented');
  }

  /**
   * Quick connectivity check against the provider API.
   */
  async healthCheck() {
    throw new Error('healthCheck not implemented');
  }
}
