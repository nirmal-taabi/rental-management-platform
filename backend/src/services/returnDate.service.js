import { isBusinessDate } from '../utils/availabilityDate.js';

export const getReturnStatus = (rentalEndDate, returnedAt) => {
  if (!isBusinessDate(rentalEndDate)) throw new TypeError('rentalEndDate must be a valid YYYY-MM-DD date.');
  const timestamp = returnedAt instanceof Date ? returnedAt : new Date(returnedAt);
  if (Number.isNaN(timestamp.getTime())) throw new TypeError('returnedAt must be a valid timestamp.');
  const actualDate = timestamp.toISOString().slice(0, 10);
  const daysLate = Math.max(0, Math.floor((Date.parse(`${actualDate}T00:00:00Z`) - Date.parse(`${rentalEndDate}T00:00:00Z`)) / 86400000));
  return {
    expectedReturnDate: rentalEndDate,
    actualReturnDate: timestamp.toISOString(),
    returnStatus: daysLate > 0 ? 'LATE' : 'ON_TIME',
    daysLate,
  };
};