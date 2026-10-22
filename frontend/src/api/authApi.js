import api from './client';

export const authApi = {
  // Staff email verification
  verifyStaff: (email) => api.get(`/auth/verify-staff?email=${encodeURIComponent(email)}`),
  
  // Registration with OTP verification
  register: (payload) => api.post('/auth/register', payload),
  
  // Current user profile
  getMe: () => api.get('/auth/me'),
  
  // Refresh token
  refreshToken: (token) => api.post('/auth/refreshToken', { token }),
  
  // Magic link (One-Time Token)
  sendMagicLink: (email) => api.post(`/ott/sent?email=${encodeURIComponent(email)}`),
  loginWithOtt: (token) => api.post(`/ott/login?token=${encodeURIComponent(token)}`),
  
  // Phone OTP
  sendOtp: (payload) => api.post('/otp/send', payload),
  sendRegistrationOtp: (payload) => api.post('/otp/send-registration', payload),
  verifyOtp: (payload) => api.post('/otp/verify', payload),
  resendOtp: (payload) => api.post('/otp/resend', payload),
};

export default authApi;
