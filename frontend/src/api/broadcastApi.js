import api from './client';

export const broadcastApi = {
  createBroadcast: (venueSlug, { title, message, severity, targetZone, durationMinutes }) =>
    api.post(`/staff/venues/${venueSlug}/broadcasts`, {
      title,
      message,
      severity,
      targetZone,
      durationMinutes,
    }),

  listActive: (venueSlug) =>
    api.get(`/staff/venues/${venueSlug}/broadcasts`),

  deactivate: (venueSlug, alertId) =>
    api.post(`/staff/venues/${venueSlug}/broadcasts/${alertId}/deactivate`),
};

export default broadcastApi;
