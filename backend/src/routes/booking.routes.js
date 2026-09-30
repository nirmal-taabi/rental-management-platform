import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorization.middleware.js';
import {
  changeBookingStatus,
  createBooking,
  getBooking,
  getBookings,
  updateBooking,
} from '../controllers/booking.controller.js';
import { getBookingPayments } from '../controllers/payment.controller.js';
import { confirmPickup, createBookingReturn, getBookingReturns, getPickup } from '../controllers/lifecycle.controller.js';

const router = express.Router();
const canView = [authMiddleware, authorizeRoles('OWNER', 'ADMIN', 'STAFF')];
const canManage = [authMiddleware, authorizeRoles('OWNER', 'ADMIN', 'STAFF')];
const canCancel = [authMiddleware, authorizeRoles('OWNER', 'ADMIN')];

router.get('/', ...canView, getBookings);
router.post('/', ...canManage, createBooking);
router.get('/:id/payments', ...canView, getBookingPayments);
router.get('/:id/pickup', ...canView, getPickup);
router.post('/:id/pickup', ...canManage, confirmPickup);
router.get('/:id/returns', ...canView, getBookingReturns);
router.post('/:id/return', ...canManage, createBookingReturn);
router.get('/:id', ...canView, getBooking);
router.put('/:id', ...canManage, updateBooking);
router.patch('/:id/status', ...canManage, changeBookingStatus);
router.patch('/:id/cancel', ...canCancel, (req, res, next) => {
  req.body ||= {};
  req.body.status = 'CANCELLED';
  return changeBookingStatus(req, res, next);
});

export default router;