export const paymentTypes = ['RENTAL', 'DEPOSIT', 'LATE_FEE', 'DAMAGE_CHARGE', 'OTHER'];
export const paymentMethods = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER'];

export const paymentStatusTone = (status) => ({
  SUCCESS: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  PENDING: 'border-sky-300 bg-sky-50 text-sky-800',
  FAILED: 'border-rose-300 bg-rose-50 text-rose-800',
  CANCELLED: 'border-stone-300 bg-stone-100 text-stone-700',
  REFUNDED: 'border-stone-300 bg-stone-100 text-stone-700',
  PARTIALLY_REFUNDED: 'border-amber-300 bg-amber-50 text-amber-900',
}[String(status || '').toUpperCase()] || 'border-slate-300 bg-slate-100 text-slate-700');

export const paymentStatusLabel = (status) => String(status || 'UNKNOWN').replaceAll('_', ' ');