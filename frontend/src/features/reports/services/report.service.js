import apiClient from '../../../services/apiClient';

export const reportService = {
  getBookings: async (params) => {
    const [trend, status] = await Promise.all([
      apiClient.get('/reports/bookings', { params }),
      apiClient.get('/reports/bookings/status', { params }),
    ]);
    return { trend: trend.data.data, status: status.data.data };
  },
  getPayments: async (params) => (await apiClient.get('/reports/payments', { params })).data.data,
  getInventory: async () => (await apiClient.get('/reports/inventory')).data.data,
  getProducts: async (params) => (await apiClient.get('/reports/products/top', { params })).data.data,
  getCategories: async (params) => (await apiClient.get('/reports/categories', { params })).data.data,
  getCustomers: async (params) => (await apiClient.get('/reports/customers', { params })).data.data,
  getReturns: async (params) => {
    const [summary, late, damage] = await Promise.all([
      apiClient.get('/reports/returns', { params }),
      apiClient.get('/reports/returns/late', { params }),
      apiClient.get('/reports/inventory/damage', { params }),
    ]);
    return { summary: summary.data.data, late: late.data.data, damage: damage.data.data };
  },
  exportBookings: (params) => apiClient.get('/reports/bookings/export', { params, responseType: 'blob' }),
};