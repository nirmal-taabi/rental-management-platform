import express from 'express';
import { createShop, getShops, switchShop, updateMemberShop, updateShopStatus } from '../controllers/shop.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', authMiddleware, getShops);
router.post('/', authMiddleware, createShop);
router.post('/:shopId/switch', authMiddleware, switchShop);
router.put('/:shopId', authMiddleware, updateMemberShop);
router.patch('/:shopId/status', authMiddleware, updateShopStatus);

export default router;