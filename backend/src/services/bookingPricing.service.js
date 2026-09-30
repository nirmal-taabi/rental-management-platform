import { BAD_REQUEST } from '../constants/httpStatus.js';
import AppError from '../utils/AppError.js';
import { rentalDayCount } from '../utils/availabilityDate.js';

const toCents = (value, field) => {
  const amount = String(value ?? '0').trim();
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(amount)) {
    throw new AppError('Invalid booking pricing.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field, message: `${field} must be a non-negative amount with up to two decimal places.` }]);
  }
  const [whole, fraction = ''] = amount.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
};

const fromCents = (cents) => (cents / 100).toFixed(2);

export const calculateBookingPricing = ({ items, rentalStartDate, rentalEndDate, discountAmount = 0, taxAmount = 0 }) => {
  const rentalDays = rentalDayCount(rentalStartDate, rentalEndDate);
  const bookingDiscountCents = toCents(discountAmount, 'discountAmount');
  const bookingTaxCents = toCents(taxAmount, 'taxAmount');
  const pricedItems = items.map((item, index) => {
    const rentalPriceCents = toCents(item.dailyRentalRate, `items.${index}.dailyRentalRate`) * rentalDays;
    const itemDiscountCents = toCents(item.discountAmount, `items.${index}.discountAmount`);
    const itemTaxCents = toCents(item.taxAmount, `items.${index}.taxAmount`);
    const depositCents = toCents(item.securityDeposit, `items.${index}.securityDeposit`);
    if (itemDiscountCents > rentalPriceCents) {
      throw new AppError('Invalid booking pricing.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field: `items.${index}.discountAmount`, message: 'Item discount cannot exceed its rental price.' }]);
    }
    return {
      ...item,
      rentalPriceCents,
      itemDiscountCents,
      itemTaxCents,
      depositCents,
      totalCents: rentalPriceCents - itemDiscountCents + itemTaxCents,
    };
  });
  const subtotalCents = pricedItems.reduce((total, item) => total + item.rentalPriceCents, 0);
  const itemDiscountCents = pricedItems.reduce((total, item) => total + item.itemDiscountCents, 0);
  if (bookingDiscountCents + itemDiscountCents > subtotalCents) {
    throw new AppError('Invalid booking pricing.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field: 'discountAmount', message: 'Combined discounts cannot exceed the rental subtotal.' }]);
  }
  const itemTaxCents = pricedItems.reduce((total, item) => total + item.itemTaxCents, 0);
  const depositCents = pricedItems.reduce((total, item) => total + item.depositCents, 0);
  const totalCents = subtotalCents - itemDiscountCents - bookingDiscountCents + itemTaxCents + bookingTaxCents;

  return {
    rentalDays,
    items: pricedItems.map((item) => ({
      ...item,
      rentalPrice: fromCents(item.rentalPriceCents),
      discountAmount: fromCents(item.itemDiscountCents),
      taxAmount: fromCents(item.itemTaxCents),
      totalAmount: fromCents(item.totalCents),
      depositAmount: fromCents(item.depositCents),
    })),
    subtotal: fromCents(subtotalCents),
    discountAmount: fromCents(itemDiscountCents + bookingDiscountCents),
    bookingDiscountAmount: fromCents(bookingDiscountCents),
    taxAmount: fromCents(itemTaxCents + bookingTaxCents),
    bookingTaxAmount: fromCents(bookingTaxCents),
    depositAmount: fromCents(depositCents),
    totalAmount: fromCents(totalCents),
    balanceAmount: fromCents(totalCents + depositCents),
  };
};