import apiClient from '../../../services/apiClient';

export const shopService = {
  getShops: async () => apiClient.get('/shops'),
  createShop: async (payload) => apiClient.post('/shops', payload),
  switchShop: async (shopId) => apiClient.post(`/shops/${shopId}/switch`),
  updateShop: async (shopId, payload) => apiClient.put(`/shops/${shopId}`, payload),
  updateStatus: async (shopId, status) => apiClient.patch(`/shops/${shopId}/status`, { status }),
  getCurrentShop: async () => apiClient.get('/shop'),
  updateCurrentShop: async (payload) => apiClient.put('/shop', payload),
};