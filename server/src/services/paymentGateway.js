import crypto from 'node:crypto';

/**
 * Mock payment gateway.
 *
 * Behaves like a real processor (validation, declines, transaction ids) so the full
 * booking -> payment -> check-out flow works end to end. To go live, replace
 * chargeCard() with a provider SDK (Stripe, Razorpay, Adyen...) and collect card
 * details with the provider's hosted fields so raw card data never reaches this server.
 *
 * Test cards: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined.
 */

const DECLINED_TEST_CARD = '4000000000000002';

function passesLuhn(number) {
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = Number(number[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function detectBrand(number) {
  if (/^4/.test(number)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(number)) return 'mastercard';
  if (/^3[47]/.test(number)) return 'amex';
  if (/^6/.test(number)) return 'discover';
  return 'card';
}

function isExpired(expiry) {
  const match = /^(\d{2})\s*\/\s*(\d{2}|\d{4})$/.exec(expiry || '');
  if (!match) return true;
  const month = Number(match[1]);
  const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
  if (month < 1 || month > 12) return true;
  // Card is valid through the last day of its expiry month.
  return new Date(year, month, 1) <= new Date();
}

const newTransactionId = (prefix) => `${prefix}_${crypto.randomBytes(10).toString('hex')}`;

export async function chargeCard({ card }) {
  const number = String(card?.number || '').replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(number) || !passesLuhn(number)) {
    return { success: false, message: 'Invalid card number' };
  }
  if (isExpired(card.expiry)) return { success: false, message: 'Card is expired or expiry is invalid (MM/YY)' };
  if (!/^\d{3,4}$/.test(String(card.cvc || ''))) return { success: false, message: 'Invalid security code' };

  const base = { brand: detectBrand(number), last4: number.slice(-4) };
  if (number === DECLINED_TEST_CARD) return { ...base, success: false, message: 'Card was declined by the issuer' };

  return { ...base, success: true, transactionId: newTransactionId('ch') };
}

// Cash / UPI / bank transfer are taken at the front desk and simply recorded.
export async function recordOfflinePayment() {
  return { success: true, transactionId: newTransactionId('off') };
}

export async function refund(payment) {
  return { success: true, transactionId: `${payment.transactionId}_rf` };
}
