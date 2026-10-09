import apiClient from '../../../services/apiClient';

export const teamService = {
  getMembers: () => apiClient.get('/team'),
  createMember: (payload) => apiClient.post('/team', payload),
  updateMemberStatus: (userId, status) => apiClient.patch(`/team/${userId}/status`, { status }),
};
