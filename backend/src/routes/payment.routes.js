import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorization.middleware.js';
import {
  cancelPayment,
  changePaymentStatus,
  createPayment,
  getPayment,
  getPayments,
  getPaymentSummary,
} from '../controllers/payment.controller.js';

const router = express.Router();
const canView = [authMiddleware, authorizeRoles('OWNER', 'ADMIN', 'STAFF')];
const canRecord = [authMiddleware, authorizeRoles('OWNER', 'ADMIN', 'STAFF')];
const canManage = [authMiddleware, authorizeRoles('OWNER', 'ADMIN')];

router.get('/summary', ...canManage, getPaymentSummary);
router.get('/', ...canView, getPayments);
router.post('/', ...canRecord, createPayment);
router.get('/:id', ...canView, getPayment);
router.patch('/:id/status', ...canManage, changePaymentStatus);
router.post('/:id/cancel', ...canManage, cancelPayment);

export default router;