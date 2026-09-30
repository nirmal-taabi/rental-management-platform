import apiClient from '../../../services/apiClient';

export const authService = {
  register: async (payload) => apiClient.post('/auth/register', payload),
  login: async (payload) => apiClient.post('/auth/login', payload),
  logout: async () => apiClient.post('/auth/logout'),
  getCurrentUser: async () => apiClient.get('/auth/me'),
};
