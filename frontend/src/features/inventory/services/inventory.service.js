import apiClient from '../../../services/apiClient';

export const inventoryService = {
  getInventory: (params = {}) => apiClient.get('/inventory', { params }),
  getSummary: (params = {}) => apiClient.get('/inventory/summary', { params }),
  getInventoryItem: (id) => apiClient.get(`/inventory/${id}`),
  createInventoryItem: (data) => apiClient.post('/inventory', data),
  updateInventoryItem: (id, data) => apiClient.put(`/inventory/${id}`, data),
  updateStatus: (id, status) => apiClient.patch(`/inventory/${id}/status`, { status }),
  updateCondition: (id, condition) => apiClient.patch(`/inventory/${id}/condition`, { condition }),
  retire: (id) => apiClient.patch(`/inventory/${id}/retire`),
};