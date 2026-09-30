import apiClient from '../../../services/apiClient';

export const categoryService = {
  getCategories: (params = {}) => apiClient.get('/categories', { params }),
  getCategory: (id) => apiClient.get(`/categories/${id}`),
  createCategory: (data) => apiClient.post('/categories', data),
  updateCategory: (id, data) => apiClient.put(`/categories/${id}`, data),
  updateCategoryStatus: (id, status) => apiClient.patch(`/categories/${id}/status`, { status }),
};