import api from './client';

export const adminApi = {
  listStaffUsers: () => api.get('/staff/admin/users'),
  updateStaffRole: (userId, role) =>
    api.put(`/staff/admin/users/${userId}/role`, { role }),
  approveStaffUser: (userId) =>
    api.put(`/staff/admin/users/${userId}/approve`),
  deleteStaffUser: (userId) =>
    api.delete(`/staff/admin/users/${userId}`),
};

export default adminApi;
