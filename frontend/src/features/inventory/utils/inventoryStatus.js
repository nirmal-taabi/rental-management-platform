export const inventoryStatuses = [
  'AVAILABLE', 'RESERVED', 'RENTED', 'RETURNED', 'INSPECTION',
  'CLEANING', 'ALTERATION', 'REPAIR', 'DAMAGED', 'LOST', 'RETIRED',
];

export const inventoryConditions = ['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'];

export const inventoryStatusStyle = (status) => {
  if (status === 'AVAILABLE') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'RESERVED') return 'border-sky-200 bg-sky-50 text-sky-800';
  if (status === 'RENTED') return 'border-indigo-200 bg-indigo-50 text-indigo-800';
  if (['CLEANING', 'ALTERATION', 'REPAIR', 'INSPECTION'].includes(status)) return 'border-amber-200 bg-amber-50 text-amber-900';
  if (['DAMAGED', 'LOST'].includes(status)) return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-slate-300 bg-slate-100 text-slate-700';
};

export const inventoryStatusDescription = (status) => ({
  AVAILABLE: 'Ready for rental',
  RESERVED: 'Reserved',
  RENTED: 'With customer',
  RETURNED: 'Returned',
  INSPECTION: 'Inspection',
  CLEANING: 'Cleaning',
  ALTERATION: 'Alteration',
  REPAIR: 'Repair',
  DAMAGED: 'Damaged',
  LOST: 'Lost',
  RETIRED: 'Retired',
}[status] || status);

export const dateOnly = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};