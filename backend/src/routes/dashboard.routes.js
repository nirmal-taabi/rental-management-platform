import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorization.middleware.js';
import { getActivity, getAttention, getOperations, getSummary } from '../controllers/dashboard.controller.js';

const router = express.Router();
router.use(authMiddleware, authorizeRoles('OWNER', 'ADMIN', 'STAFF'));
router.get('/summary', getSummary);
router.get('/operations', getOperations);
router.get('/attention', getAttention);
router.get('/activity', getActivity);

export default router;