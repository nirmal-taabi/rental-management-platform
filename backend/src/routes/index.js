import express from 'express';
import healthRoutes from './health.routes.js';
import exampleRoutes from './example.routes.js';
import authRoutes from './auth.routes.js';
import shopRoutes from './shop.routes.js';
import customerRoutes from './customer.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import inventoryRoutes from './inventory.routes.js';
import bookingRoutes from './booking.routes.js';
import availabilityRoutes from './availability.routes.js';
import paymentRoutes from './payment.routes.js';
import returnRoutes from './return.routes.js';
import locationRoutes from './location.routes.js';

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/examples', exampleRoutes);
router.use('/auth', authRoutes);
router.use('/shop', shopRoutes);
router.use('/customers', customerRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/availability', availabilityRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/returns', returnRoutes);
router.use('/locations', locationRoutes);

export default router;
