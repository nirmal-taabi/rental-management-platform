export const returnConditions = ['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'];
export const returnDamageStatuses = ['NONE', 'MINOR', 'MAJOR', 'LOST'];

export const returnStatusTone = (status) => ({
  ON_TIME: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  LATE: 'border-amber-300 bg-amber-50 text-amber-900',
  PARTIAL: 'border-sky-300 bg-sky-50 text-sky-800',
  COMPLETED: 'border-stone-300 bg-stone-100 text-stone-700',
}[String(status || '').toUpperCase()] || 'border-stone-300 bg-stone-100 text-stone-700');