import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorization.middleware.js';
import {
  getInventoryAvailability,
  getProductAvailabilityItems,
  getShopInventoryAvailabilityItems,
  postBulkAvailability,
} from '../controllers/availability.controller.js';

const router = express.Router();
const canView = [authMiddleware, authorizeRoles('OWNER', 'ADMIN', 'STAFF')];

router.get('/', ...canView, getInventoryAvailability);
router.post('/check', ...canView, postBulkAvailability);
router.get('/items', ...canView, getShopInventoryAvailabilityItems);
router.get('/products', ...canView, getProductAvailabilityItems);

export default router;