import api from './client';

export const responderApi = {
  getTacticalPacket: (responderToken) =>
    api.get(`/responder/${encodeURIComponent(responderToken)}`),

  updateStatus: (responderToken, status, note = '') =>
    api.post(`/responder/${encodeURIComponent(responderToken)}/status`, {
      status,
      note,
    }),

  addNote: (responderToken, note) =>
    api.post(`/responder/${encodeURIComponent(responderToken)}/notes`, {
      note,
    }),
};

export default responderApi;
