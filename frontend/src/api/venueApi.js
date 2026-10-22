import api from './client';

export const venueApi = {
  getVenues: () => api.get('/venues'),
  getVenueBySlug: (slug) => api.get(`/venues/${slug}`),
};

export default venueApi;
