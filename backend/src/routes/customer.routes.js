import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorization.middleware.js';
import {
	createCustomer,
	createCustomerDraft,
	getCustomer,
	getCustomerDraft,
	getCustomerDrafts,
	getCustomers,
	removeCustomerDraft,
	updateCustomer,
	updateCustomerDraft,
	updateCustomerStatus,
} from '../controllers/customer.controller.js';
import { getCustomerPayments } from '../controllers/payment.controller.js';

const router = express.Router();
const canManageCustomers = [authMiddleware, authorizeRoles('OWNER', 'ADMIN', 'STAFF')];

router.get('/drafts', ...canManageCustomers, getCustomerDrafts);
router.get('/drafts/:id', ...canManageCustomers, getCustomerDraft);
router.post('/drafts', ...canManageCustomers, createCustomerDraft);
router.put('/drafts/:id', ...canManageCustomers, updateCustomerDraft);
router.delete('/drafts/:id', ...canManageCustomers, removeCustomerDraft);
router.get('/', ...canManageCustomers, getCustomers);
router.get('/:id/payments', ...canManageCustomers, getCustomerPayments);
router.get('/:id', ...canManageCustomers, getCustomer);
router.post('/', ...canManageCustomers, createCustomer);
router.put('/:id', ...canManageCustomers, updateCustomer);
router.patch('/:id/status', authMiddleware, authorizeRoles('OWNER', 'ADMIN'), updateCustomerStatus);

export default router;
