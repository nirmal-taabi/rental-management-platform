import express from 'express';
import { getShop, updateShop } from '../controllers/shop.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorization.middleware.js';

const router = express.Router();

router.get('/', authMiddleware, getShop);
router.put('/', authMiddleware, authorizeRoles('OWNER', 'ADMIN'), updateShop);

export default router;
