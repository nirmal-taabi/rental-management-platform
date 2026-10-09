import express from 'express';
import {
  getBookings,
  getCustomers,
  getOverview,
  getShop,
  getShops,
  getUsers,
  updateShopStatus,
} from '../controllers/admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorization.middleware.js';

const router = express.Router();
router.use(authMiddleware, authorizeRoles('SUPER_ADMIN'));

router.get('/overview', getOverview);
router.get('/shops', getShops);
router.get('/shops/:shopId', getShop);
router.patch('/shops/:shopId/status', updateShopStatus);
router.get('/users', getUsers);
router.get('/customers', getCustomers);
router.get('/bookings', getBookings);

export default router;
