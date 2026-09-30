import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorization.middleware.js';
import {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  updateCategoryStatus,
} from '../controllers/category.controller.js';

const router = express.Router();
const canView = [authMiddleware, authorizeRoles('OWNER', 'ADMIN', 'STAFF')];
const canManage = [authMiddleware, authorizeRoles('OWNER', 'ADMIN')];

router.get('/', ...canView, getCategories);
router.get('/:id', ...canView, getCategory);
router.post('/', ...canManage, createCategory);
router.put('/:id', ...canManage, updateCategory);
router.patch('/:id/status', ...canManage, updateCategoryStatus);

export default router;