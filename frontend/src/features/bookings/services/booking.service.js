import apiClient from '../../../services/apiClient';

export const bookingService = {
  getBookings: (params = {}) => apiClient.get('/bookings', { params }),
  getBooking: (id) => apiClient.get(`/bookings/${id}`),
  createBooking: (payload) => apiClient.post('/bookings', payload),
  updateBooking: (id, payload) => apiClient.put(`/bookings/${id}`, payload),
  updateStatus: (id, status) => apiClient.patch(`/bookings/${id}/status`, { status }),
  cancel: (id) => apiClient.patch(`/bookings/${id}/cancel`),
  checkAvailability: (params) => apiClient.get('/availability', { params }),
  checkBulkAvailability: (payload) => apiClient.post('/availability/check', payload),
  getProductAvailability: (params) => apiClient.get('/availability/products', { params }),
  getInventoryAvailability: (params) => apiClient.get('/availability/items', { params }),
};