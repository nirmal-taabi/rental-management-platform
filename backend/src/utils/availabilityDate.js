import { CLEANUP_BUFFER_DAYS, PREPARATION_BUFFER_DAYS } from '../constants/booking.constants.js';

export const isBusinessDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const isValidRentalRange = (startDate, endDate) =>
  isBusinessDate(startDate) && isBusinessDate(endDate) && endDate >= startDate;

export const addBusinessDays = (value, days) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const getBlockedDateRange = (
  rentalStartDate,
  rentalEndDate,
  preparationBufferDays = PREPARATION_BUFFER_DAYS,
  cleanupBufferDays = CLEANUP_BUFFER_DAYS,
) => ({
  startDate: addBusinessDays(rentalStartDate, -preparationBufferDays),
  endDate: addBusinessDays(rentalEndDate, cleanupBufferDays),
});

export const getAvailabilitySearchRange = (
  rentalStartDate,
  rentalEndDate,
  preparationBufferDays = PREPARATION_BUFFER_DAYS,
  cleanupBufferDays = CLEANUP_BUFFER_DAYS,
) => {
  const combinedBufferDays = preparationBufferDays + cleanupBufferDays;
  return {
    startDate: addBusinessDays(rentalStartDate, -combinedBufferDays),
    endDate: addBusinessDays(rentalEndDate, combinedBufferDays),
  };
};

export const rentalDayCount = (startDate, endDate) => {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  return Math.floor((end - start) / 86400000) + 1;
};

export const dateRangesOverlap = (first, second) =>
  first.startDate <= second.endDate && first.endDate >= second.startDate;