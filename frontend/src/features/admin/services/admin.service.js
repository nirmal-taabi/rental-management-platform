import apiClient from '../../../services/apiClient';

export const adminService = {
  getOverview: (params = {}) => apiClient.get('/admin/overview', { params }),
  getShops: (params = {}) => apiClient.get('/admin/shops', { params }),
  getShop: (shopId) => apiClient.get(`/admin/shops/${shopId}`),
  updateShopStatus: (shopId, payload) => apiClient.patch(`/admin/shops/${shopId}/status`, payload),
  getUsers: (params = {}) => apiClient.get('/admin/users', { params }),
  getCustomers: (params = {}) => apiClient.get('/admin/customers', { params }),
  getBookings: (params = {}) => apiClient.get('/admin/bookings', { params }),
};
