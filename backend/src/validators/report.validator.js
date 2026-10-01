const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;
const GROUP_BY_VALUES = ['day', 'week', 'month'];

const businessDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
};

const isValidDate = (value) => {
  if (!DATE_PATTERN.test(String(value || ''))) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const validateReportRange = (query = {}, now = new Date()) => {
  const today = businessDate(now);
  const defaultStart = `${today.slice(0, 8)}01`;
  const startDate = query.startDate || defaultStart;
  const endDate = query.endDate || today;
  const errors = [];

  if (!isValidDate(startDate)) errors.push({ field: 'startDate', message: 'startDate must be a valid YYYY-MM-DD date.' });
  if (!isValidDate(endDate)) errors.push({ field: 'endDate', message: 'endDate must be a valid YYYY-MM-DD date.' });

  if (isValidDate(startDate) && isValidDate(endDate)) {
    const start = Date.parse(`${startDate}T00:00:00.000Z`);
    const end = Date.parse(`${endDate}T00:00:00.000Z`);
    const days = Math.floor((end - start) / 86_400_000) + 1;
    if (end < start) errors.push({ field: 'dateRange', message: 'startDate must not be after endDate.' });
    if (days > MAX_RANGE_DAYS) errors.push({ field: 'dateRange', message: `Date ranges cannot exceed ${MAX_RANGE_DAYS} days.` });
  }

  const groupBy = query.groupBy || 'day';
  if (!GROUP_BY_VALUES.includes(groupBy)) errors.push({ field: 'groupBy', message: 'groupBy must be day, week, or month.' });

  return { startDate, endDate, groupBy, errors };
};

export const validateReportLimit = (value, fallback = 10) => {
  if (value === undefined) return { value: fallback, error: null };
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    return { value: fallback, error: { field: 'limit', message: 'limit must be between 1 and 100.' } };
  }
  return { value: limit, error: null };
};