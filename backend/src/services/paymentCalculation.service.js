import { NOT_FOUND } from '../constants/httpStatus.js';
import AppError from '../utils/AppError.js';
import { fromCents, toCents } from '../utils/paymentMoney.js';
import { findBookingForPayment, sumBookingPayments } from '../repositories/payment.repository.js';

export const summarizeBookingPayments = (booking, paymentTotals) => {
  const rentalCents = toCents(booking.total_amount) ?? 0;
  const depositCents = toCents(booking.deposit_amount) ?? 0;
  const paidCents = toCents(paymentTotals.net_paid) ?? 0;
  const refundedCents = toCents(paymentTotals.refunded) ?? 0;
  const totalCents = rentalCents + depositCents;
  const balanceCents = Math.max(totalCents - paidCents, 0);
  const paymentStatus = paidCents === 0
    ? 'UNPAID'
    : paidCents < totalCents
      ? 'PARTIALLY_PAID'
      : paidCents === totalCents
        ? 'PAID'
        : 'OVERPAID';

  return {
    rentalAmount: fromCents(rentalCents),
    depositAmount: fromCents(depositCents),
    bookingTotal: fromCents(totalCents),
    totalPaid: fromCents(paidCents),
    refundedAmount: fromCents(refundedCents),
    netPaid: fromCents(paidCents),
    balanceAmount: fromCents(balanceCents),
    paymentStatus,
  };
};

export const getBookingPaymentSummary = async (shopId, bookingId, connection) => {
  const booking = await findBookingForPayment(shopId, bookingId, connection);
  if (!booking) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
  const totals = await sumBookingPayments(shopId, bookingId, connection);
  return summarizeBookingPayments(booking, totals);
};