import AppError from '../utils/AppError.js';
import { findShopById, updateShop } from '../repositories/shop.repository.js';
import { FORBIDDEN } from '../constants/httpStatus.js';

const getPublicShop = (shop) => ({
  id: shop.id,
  name: shop.name,
  businessName: shop.legal_name || shop.name,
  email: shop.email,
  phone: shop.phone,
  address: shop.address_line1,
  city: shop.city,
  state: shop.state,
  pincode: shop.postal_code,
  gstNumber: shop.gst_number,
  status: shop.status,
});

export const getShopForUser = async (shopId) => {
  const shop = await findShopById(shopId);
  if (!shop) {
    throw new AppError('Shop not found.', FORBIDDEN, 'SHOP_NOT_FOUND');
  }

  return getPublicShop(shop);
};

export const updateShopForUser = async (shopId, payload) => {
  const currentShop = await findShopById(shopId);
  if (!currentShop) {
    throw new AppError('Shop not found.', FORBIDDEN, 'SHOP_NOT_FOUND');
  }

  const normalizedPayload = {
    name: payload.name,
    businessName: payload.businessName,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    gstNumber: payload.gstNumber,
  };

  const nextShop = await updateShop(shopId, {
    name: normalizedPayload.name,
    legal_name: normalizedPayload.businessName,
    email: normalizedPayload.email,
    phone: normalizedPayload.phone,
    address_line1: normalizedPayload.address,
    city: normalizedPayload.city,
    state: normalizedPayload.state,
    postal_code: normalizedPayload.pincode,
    gst_number: normalizedPayload.gstNumber,
  });

  return getPublicShop(nextShop);
};
