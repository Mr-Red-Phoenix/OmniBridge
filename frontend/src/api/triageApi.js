import api from './client';

export const triageApi = {
  /**
   * Submit new patient intake (Nurses / STAFF)
   */
  submitIntake: (payload) => api.post('/v1/triage/intake', payload),

  /**
   * Submit doctor clinical override / review (Doctors / DOCTOR)
   */
  submitReview: (payload) => api.post('/v1/triage/review', payload),

  /**
   * Fetch active priority queue for venue
   */
  getQueue: () => api.get('/v1/triage/queue'),

  /**
   * Fetch public hall queue without auth
   */
  getPublicQueue: (venueSlug) => api.get(`/v1/triage/public/queue/${venueSlug || 'default'}`),

  /**
   * Transition patient status (IN_EXAM, ADMITTED, DISCHARGED)
   * Accessible by Doctors & Nurses. Admin is view-only.
   */
  updateStatus: (intakeId, payload) => api.put(`/v1/triage/status/${intakeId}`, payload),
};

export default triageApi;
