import apiClient from '../../../services/apiClient';

export const customerService = {
  getCustomers: async (params = {}) => apiClient.get('/customers', { params }),
  getCustomer: async (id) => apiClient.get(`/customers/${id}`),
  createCustomer: async (payload) => apiClient.post('/customers', payload),
  updateCustomer: async (id, payload) => apiClient.put(`/customers/${id}`, payload),
  updateCustomerStatus: async (id, status) => apiClient.patch(`/customers/${id}/status`, { status }),
  getCustomerDrafts: async () => apiClient.get('/customers/drafts'),
  getCustomerDraft: async (id) => apiClient.get(`/customers/drafts/${id}`),
  createCustomerDraft: async (payload) => apiClient.post('/customers/drafts', payload),
  updateCustomerDraft: async (id, payload) => apiClient.put(`/customers/drafts/${id}`, payload),
  deleteCustomerDraft: async (id) => apiClient.delete(`/customers/drafts/${id}`),
};
