import AppError from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getShopForUser, updateShopForUser } from '../services/shop.service.js';
import { validateShopUpdateInput } from '../validators/shop.validator.js';
import { BAD_REQUEST, OK } from '../constants/httpStatus.js';

export const getShop = async (req, res, next) => {
  try {
    const shop = await getShopForUser(req.user.shopId);
    return sendSuccess(res, 'Shop profile loaded.', shop, OK);
  } catch (error) {
    return next(error);
  }
};

export const updateShop = async (req, res, next) => {
  try {
    const validation = validateShopUpdateInput(req.body);
    if (!validation.isValid) {
      throw new AppError('Invalid shop update payload.', BAD_REQUEST, 'VALIDATION_ERROR');
    }

    const allowedShopId = req.user.shopId;
    const shop = await updateShopForUser(allowedShopId, req.body);
    return sendSuccess(res, 'Shop updated successfully.', shop, OK);
  } catch (error) {
    return next(error);
  }
};
