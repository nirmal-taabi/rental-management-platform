import apiClient from '../../../services/apiClient';

export const productService = {
  getProducts: (params = {}) => apiClient.get('/products', { params }),
  getProduct: (id) => apiClient.get(`/products/${id}`),
  getSkuSuggestion: (params = {}) => apiClient.get('/products/sku-suggestion', { params }),
  createProduct: (data) => apiClient.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateProduct: (id, data) => apiClient.put(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateProductStatus: (id, status) => apiClient.patch(`/products/${id}/status`, { status }),
};