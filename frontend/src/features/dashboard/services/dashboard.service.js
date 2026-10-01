import apiClient from '../../../services/apiClient';

export const dashboardService = {
  getSummary: (params) => apiClient.get('/dashboard/summary', { params }),
  getOperations: () => apiClient.get('/dashboard/operations'),
  getAttention: () => apiClient.get('/dashboard/attention'),
  getActivity: () => apiClient.get('/dashboard/activity'),
  getBookingTrend: (params) => apiClient.get('/reports/bookings', { params }),
  getPaymentReport: (params) => apiClient.get('/reports/payments', { params }),
  getTopProducts: (params) => apiClient.get('/reports/products/top', { params }),
};