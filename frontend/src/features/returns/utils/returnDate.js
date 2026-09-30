export const getReturnStatus = (rentalEndDate, returnedAt) => {
  if (!rentalEndDate || !returnedAt) return { status: 'ON_TIME', daysLate: 0 };
  const expected = Date.parse(`${rentalEndDate.slice(0, 10)}T00:00:00Z`);
  const actualDate = new Date(returnedAt).toISOString().slice(0, 10);
  const actual = Date.parse(`${actualDate}T00:00:00Z`);
  const daysLate = Math.max(0, Math.floor((actual - expected) / 86400000));
  return { status: daysLate > 0 ? 'LATE' : 'ON_TIME', daysLate };
};

export const toUtcTimestamp = (localDateTime) => new Date(localDateTime).toISOString();