import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorization.middleware.js';
import {
  exportBookings,
  getBookingStatuses,
  getBookingTrend,
  getCategoryReport,
  getCustomerReport,
  getInventoryDamage,
  getInventoryReport,
  getLateReturns,
  getPaymentReport,
  getReturnReport,
  getTopProducts,
} from '../controllers/report.controller.js';

const router = express.Router();
router.use(authMiddleware, authorizeRoles('OWNER', 'ADMIN', 'STAFF'));

router.get('/bookings/export', exportBookings);
router.get('/bookings/status', getBookingStatuses);
router.get('/bookings', getBookingTrend);
router.get('/inventory/damage', getInventoryDamage);
router.get('/inventory', getInventoryReport);
router.get('/products/top', getTopProducts);
router.get('/categories', getCategoryReport);
router.get('/customers', getCustomerReport);
router.get('/returns/late', getLateReturns);
router.get('/returns', getReturnReport);
router.get('/payments', authorizeRoles('OWNER', 'ADMIN'), getPaymentReport);

export default router;