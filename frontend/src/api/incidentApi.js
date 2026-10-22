import api, { buildSseUrl } from './client';

export const incidentApi = {
  // Public reporting
  submitReport: (venueSlug, data) => api.post(`/report/${venueSlug}`, data),
  submitSos: (venueSlug, data) => api.post(`/report/${venueSlug}/sos`, data),

  // Staff Incident Command
  getStaffIncidents: () => api.get('/staff/incidents'),
  getIncidentDetail: (incidentId) => api.get(`/staff/incidents/${incidentId}`),
  
  acknowledge: (incidentId) => api.post(`/staff/incidents/${incidentId}/acknowledge`),
  assignToSelf: (incidentId) => api.post(`/staff/incidents/${incidentId}/assign-to-self`),
  
  verifyIncident: (incidentId, dispatchEmergency = false, dispatchReason = '') => {
    const params = new URLSearchParams();
    if (dispatchEmergency) params.append('dispatchEmergency', 'true');
    if (dispatchReason) params.append('dispatchReason', dispatchReason);
    const query = params.toString();
    return api.post(`/staff/incidents/${incidentId}/verify${query ? `?${query}` : ''}`);
  },

  flagFalseAlarm: (incidentId, reason) =>
    api.post(`/staff/incidents/${incidentId}/flag-false-alarm`, { reason }),

  updateStatus: (incidentId, status) =>
    api.post(`/staff/incidents/${incidentId}/status`, { status }),

  addTimelineUpdate: (incidentId, { message, isPublicToGuest = true, updateType = 'NOTE' }) =>
    api.post(`/staff/incidents/${incidentId}/updates`, {
      message,
      isPublicToGuest,
      updateType,
    }),

  dispatchEmergency: (incidentId, reason = '') => {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return api.post(`/staff/incidents/${incidentId}/dispatch-emergency${query}`);
  },

  // SSE Stream URL
  getStaffStreamUrl: () => buildSseUrl('/staff/incidents/stream'),
};

export default incidentApi;
