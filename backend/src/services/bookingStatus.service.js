import { BOOKING_STATUS_TRANSITIONS } from '../constants/booking.constants.js';

export const getAllowedBookingTransitions = (status) => BOOKING_STATUS_TRANSITIONS[String(status || '').toUpperCase()] || [];

export const canTransitionBookingStatus = (currentStatus, nextStatus) =>
  getAllowedBookingTransitions(currentStatus).includes(String(nextStatus || '').toUpperCase());