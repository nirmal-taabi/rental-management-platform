import { sendSuccess } from '../utils/apiResponse.js';
import { getHealthStatus } from '../services/health.service.js';

export const getHealth = async (req, res, next) => {
  try {
    const healthStatus = getHealthStatus();
    return sendSuccess(res, 'Rental Management API is running', healthStatus, 200);
  } catch (error) {
    return next(error);
  }
};
