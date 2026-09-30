import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorization.middleware.js';
import {
  createInventoryItem,
  getInventory,
  getInventoryItem,
  getInventorySummary,
  retireInventoryItem,
  updateInventoryCondition,
  updateInventoryItem,
  updateInventoryStatus,
} from '../controllers/inventory.controller.js';
import { getInventoryReturns } from '../controllers/lifecycle.controller.js';

const router = express.Router();
const canView = [authMiddleware, authorizeRoles('OWNER', 'ADMIN', 'STAFF')];
const canEditMetadata = [authMiddleware, authorizeRoles('OWNER', 'ADMIN', 'STAFF')];
const canManageStatus = [authMiddleware, authorizeRoles('OWNER', 'ADMIN')];

router.get('/', ...canView, getInventory);
router.get('/summary', ...canView, getInventorySummary);
router.get('/:id/returns', ...canView, getInventoryReturns);
router.get('/:id', ...canView, getInventoryItem);
router.post('/', ...canManageStatus, createInventoryItem);
router.put('/:id', ...canEditMetadata, updateInventoryItem);
router.patch('/:id/status', ...canManageStatus, updateInventoryStatus);
router.patch('/:id/condition', ...canEditMetadata, updateInventoryCondition);
router.patch('/:id/retire', ...canManageStatus, retireInventoryItem);

export default router;