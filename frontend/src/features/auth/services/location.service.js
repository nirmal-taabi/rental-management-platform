import apiClient from '../../../services/apiClient';

export const locationService = {
  getStates: () => apiClient.get('/locations/states'),
  getCitiesByState: (stateId) => apiClient.get(`/locations/states/${stateId}/cities`),
};