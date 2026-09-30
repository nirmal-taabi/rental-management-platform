export const toCents = (value) => {
  const text = String(value ?? '').trim();
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
};

export const fromCents = (cents) => (cents / 100).toFixed(2);