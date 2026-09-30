const ACTIVE_SHOP_STORAGE_KEY = 'rental-management.activeShopId';

export const getActiveShopPreference = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ACTIVE_SHOP_STORAGE_KEY) || '';
};

export const setActiveShopPreference = (shopId) => {
  if (typeof window === 'undefined') return;
  if (shopId === undefined || shopId === null || shopId === '') {
    window.localStorage.removeItem(ACTIVE_SHOP_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(ACTIVE_SHOP_STORAGE_KEY, String(shopId));
};

export const clearActiveShopPreference = () => setActiveShopPreference('');