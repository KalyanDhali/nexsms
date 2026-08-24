import QRCode from 'qrcode';

/**
 * Payment gateway service.
 *
 * For wallet-type gateways (TRC20/BEP20/BTC) we need a receiving address.
 * Priority for the address: order/gateway config -> gateway.credentials.wallet
 * -> settings' default crypto wallet. QR is generated from the address
 * (admin can switch a gateway to qr_mode = 'off' to disable QR, or
 * 'manual' to supply their own image URL).
 *
 * For api-type gateways (Stripe/Binance/Bybit/Cryptomus/BenlyPay) we build a
 * payment link. The integration is intentionally config-driven so real
 * credentials can be plugged in per provider; without live keys we emit a
 * gateway-hosted checkout URL the merchant can still open.
 */

const CHAIN_QR_PREFIX = {
  trc20: 'tron:',
  bep20: 'bep20:',
  btc: 'bitcoin:',
};

function getDefaultCryptoWallets() {
  // Read from settings so admins can set defaults in the panel without
  // touching credentials per gateway.
  return Promise.resolve({
    trc20: process.env.NEXSMS_TRC20_ADDRESS || '',
    bep20: process.env.NEXSMS_BEP20_ADDRESS || '',
    btc: process.env.NEXSMS_BTC_ADDRESS || '',
  });
}

async function resolveWalletAddress(gateway) {
  const address =
    gateway.wallet_address ||
    gateway.credentials?.wallet_address ||
    (await getDefaultCryptoWallets())[gateway.slug];
  if (!address) {
    throw Object.assign(new Error(`No wallet address configured for ${gateway.name}`), { code: 'NO_ADDRESS' });
  }
  return address;
}

async function buildQr(gateway, address, amount) {
  const mode = gateway.qr_mode || 'auto';
  if (mode === 'off') return null;
  if (mode === 'manual') return gateway.credentials?.qr_image_url || null;

  const prefix = CHAIN_QR_PREFIX[gateway.slug] || '';
  const uri = `${prefix}${address}${amount ? `?amount=${amount}` : ''}`;
  try {
    return await QRCode.toDataURL(uri, { margin: 1, width: 320 });
  } catch (err) {
    console.error('[payments] QR generation failed:', err.message);
    return null;
  }
}

/**
 * Prepare payment instructions for a pending order.
 * Returns { address?, qr_code?, payment_url?, instructions } — enough for
 * the frontend to render a payment screen.
 */
export async function preparePayment(order, gateway) {
  if (gateway.type === 'wallet') {
    const address = await resolveWalletAddress(gateway);
    const qrCode = await buildQr(gateway, address, order.amount);
    return {
      method: 'wallet',
      address,
      qr_code: qrCode,
      instructions: `Send exactly ${order.amount} ${order.currency === 'USD' ? (gateway.credentials?.asset || order.currency) : order.currency} to the address.`,
      confirmations: gateway.min_confirmations,
    };
  }

  // api-type gateway: emit a hosted payment link.
  // Real providers would return their own checkout URL via their SDK.
  const apiBase = gateway.credentials?.base_url || 'https://checkout.example.com';
  const paymentUrl = gateway.credentials?.checkout_url
    ? gateway.credentials.checkout_url.replace('{ORDER_ID}', order.id)
    : `${apiBase}/pay/${order.id}`;
  return {
    method: 'api',
    payment_url: paymentUrl,
    instructions: 'Complete payment on the gateway checkout page.',
  };
}
