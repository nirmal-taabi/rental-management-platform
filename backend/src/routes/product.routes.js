import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorization.middleware.js';
import { productImageUpload } from '../middlewares/productUpload.middleware.js';
import {
  createProduct,
  getProduct,
  getProductImage,
  getProducts,
  getProductSkuSuggestion,
  updateProduct,
  updateProductStatus,
} from '../controllers/product.controller.js';

const router = express.Router();
const canView = [authMiddleware, authorizeRoles('OWNER', 'ADMIN', 'STAFF')];
const canManage = [authMiddleware, authorizeRoles('OWNER', 'ADMIN')];

router.get('/', ...canView, getProducts);
router.get('/sku-suggestion', ...canView, getProductSkuSuggestion);
router.get('/images/:shopId/:filename', ...canView, getProductImage);
router.get('/:id', ...canView, getProduct);
router.post('/', ...canManage, productImageUpload, createProduct);
router.put('/:id', ...canManage, productImageUpload, updateProduct);
router.patch('/:id/status', ...canManage, updateProductStatus);

export default router;