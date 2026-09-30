import apiClient from '../../../services/apiClient';

export const returnService = {
  confirmPickup: (bookingId, payload) => apiClient.post(`/bookings/${bookingId}/pickup`, payload),
  getPickup: (bookingId) => apiClient.get(`/bookings/${bookingId}/pickup`),
  recordReturn: (bookingId, payload) => apiClient.post(`/bookings/${bookingId}/return`, payload),
  getReturns: (params = {}) => apiClient.get('/returns', { params }),
  getReturn: (id) => apiClient.get(`/returns/${id}`),
  getBookingReturns: (bookingId, params = {}) => apiClient.get(`/bookings/${bookingId}/returns`, { params }),
  getInventoryReturns: (inventoryItemId, params = {}) => apiClient.get(`/inventory/${inventoryItemId}/returns`, { params }),
};