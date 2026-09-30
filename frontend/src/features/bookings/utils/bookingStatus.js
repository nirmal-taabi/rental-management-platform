export const bookingStatuses = ['DRAFT', 'PENDING', 'CONFIRMED', 'READY', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export const bookingTransitions = {
  DRAFT: ['PENDING', 'CANCELLED'],
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['READY', 'CANCELLED'],
  READY: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const bookingStatusTone = (status) => ({
  DRAFT: 'border-slate-300 bg-slate-100 text-slate-700',
  PENDING: 'border-amber-300 bg-amber-50 text-amber-800',
  CONFIRMED: 'border-sky-300 bg-sky-50 text-sky-800',
  READY: 'border-teal-300 bg-teal-50 text-teal-800',
  ACTIVE: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  COMPLETED: 'border-stone-300 bg-stone-100 text-stone-700',
  CANCELLED: 'border-rose-300 bg-rose-50 text-rose-800',
}[String(status || '').toUpperCase()] || 'border-slate-300 bg-slate-100 text-slate-700');