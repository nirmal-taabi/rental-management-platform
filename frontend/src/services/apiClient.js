import axios from 'axios';
import { getActiveShopPreference } from './activeShopPreference';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const activeShopId = getActiveShopPreference();
  if (activeShopId) {
    config.headers['X-Shop-Id'] = activeShopId;
  }
  return config;
});

export default apiClient;
