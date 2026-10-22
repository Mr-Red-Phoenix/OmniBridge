import api, { buildSseUrl } from './client';

export const guestApi = {
  // Guest Lifeline
  getLifeline: (incidentId, token) =>
    api.get(`/guest/incidents/${incidentId}?token=${encodeURIComponent(token)}`),

  sendMessage: (incidentId, token, message) =>
    api.post(
      `/guest/incidents/${incidentId}/messages?token=${encodeURIComponent(token)}`,
      { message }
    ),

  // Public Venue Broadcast Alerts
  getVenueBroadcasts: (venueSlug) =>
    api.get(`/guest/venues/${venueSlug}/broadcasts`),

  // Stream URLs
  getLifelineStreamUrl: (incidentId, token) =>
    buildSseUrl(`/guest/incidents/${incidentId}/stream`, { token }),

  getVenueBroadcastStreamUrl: (venueSlug) =>
    buildSseUrl(`/guest/venues/${venueSlug}/broadcasts/stream`),
};

export default guestApi;
