import apiClient from '../../../services/apiClient';

export const paymentService = {
  getPayments: (params = {}) => apiClient.get('/payments', { params }),
  getSummary: (params = {}) => apiClient.get('/payments/summary', { params }),
  getPayment: (id) => apiClient.get(`/payments/${id}`),
  createPayment: (payload) => apiClient.post('/payments', payload),
  updateStatus: (id, status) => apiClient.patch(`/payments/${id}/status`, { status }),
  cancelPayment: (id, reason) => apiClient.post(`/payments/${id}/cancel`, { reason }),
  getBookingPayments: (bookingId, params = {}) => apiClient.get(`/bookings/${bookingId}/payments`, { params }),
  getCustomerPayments: (customerId, params = {}) => apiClient.get(`/customers/${customerId}/payments`, { params }),
};