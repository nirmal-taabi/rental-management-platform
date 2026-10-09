import express from 'express';
import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse.js';
import { register, login, me, logout, changePassword, forgotPassword, resetPasswordWithToken } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();
const createPasswordRecoveryLimiter = (max) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => sendError(
    res,
    'Too many password recovery attempts. Please try again later.',
    { code: 'RATE_LIMIT_EXCEEDED' },
    429,
  ),
});

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', createPasswordRecoveryLimiter(5), forgotPassword);
router.post('/reset-password', createPasswordRecoveryLimiter(10), resetPasswordWithToken);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);
router.post('/change-password', authMiddleware, changePassword);

export default router;
