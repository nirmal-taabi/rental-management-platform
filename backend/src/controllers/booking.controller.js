import { sendSuccess } from '../utils/apiResponse.js';
import { CREATED, OK } from '../constants/httpStatus.js';
import {
  changeBookingStatusForShop,
  createBookingForShop,
  getBookingForShop,
  listBookingsForShop,
  updateBookingForShop,
} from '../services/booking.service.js';

const auditContext = (req) => ({ userId: req.user.id, ipAddress: req.ip });

export const getBookings = async (req, res, next) => {
  try {
    const result = await listBookingsForShop(req.user.shopId, req.query);
    return res.status(OK).json({ success: true, message: 'Bookings retrieved successfully.', ...result });
  } catch (error) {
    return next(error);
  }
};

export const getBooking = async (req, res, next) => {
  try {
    const booking = await getBookingForShop(req.user.shopId, req.params.id);
    return sendSuccess(res, 'Booking retrieved successfully.', booking, OK);
  } catch (error) {
    return next(error);
  }
};

export const createBooking = async (req, res, next) => {
  try {
    const booking = await createBookingForShop(req.user.shopId, req.user.id, req.body, auditContext(req));
    return sendSuccess(res, 'Booking created successfully.', booking, CREATED);
  } catch (error) {
    return next(error);
  }
};

export const updateBooking = async (req, res, next) => {
  try {
    const booking = await updateBookingForShop(req.user.shopId, req.params.id, req.body, auditContext(req));
    return sendSuccess(res, 'Booking updated successfully.', booking, OK);
  } catch (error) {
    return next(error);
  }
};

export const changeBookingStatus = async (req, res, next) => {
  try {
    const booking = await changeBookingStatusForShop(req.user.shopId, req.params.id, req.body.status, auditContext(req));
    return sendSuccess(res, 'Booking status updated successfully.', booking, OK);
  } catch (error) {
    return next(error);
  }
};