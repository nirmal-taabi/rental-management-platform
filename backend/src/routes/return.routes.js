import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorization.middleware.js';
import { getReturn, getReturns } from '../controllers/lifecycle.controller.js';

const router = express.Router();
const canView = [authMiddleware, authorizeRoles('OWNER', 'ADMIN', 'STAFF')];

router.get('/', ...canView, getReturns);
router.get('/:id', ...canView, getReturn);

export default router;