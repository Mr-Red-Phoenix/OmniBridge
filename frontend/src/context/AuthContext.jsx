import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import authApi from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [jwt, setJwt] = useState(() => localStorage.getItem('jwt') || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync state with storage
  const syncAuthState = useCallback(() => {
    const token = localStorage.getItem('jwt');
    setJwt(token);
    try {
      const storedUser = localStorage.getItem('user');
      setUser(storedUser ? JSON.parse(storedUser) : null);
    } catch {
      setUser(null);
    }
  }, []);

  const loginWithJwtResponse = useCallback((data) => {
    if (!data?.accessToken) return;
    localStorage.setItem('jwt', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }

    const userData = {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      venueId: data.venueId,
      venueName: data.venueName,
      venueSlug: data.venueSlug,
    };

    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('role', data.role || '');
    setJwt(data.accessToken);
    setUser(userData);
    window.dispatchEvent(new Event('auth_changed'));
  }, []);

  const logout = useCallback((options = {}) => {
    const isExplicit = options?.explicit ?? true;
    localStorage.removeItem('jwt');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    setJwt(null);
    setUser(null);
    window.dispatchEvent(new Event('auth_changed'));
    if (isExplicit) {
      toast.info('Signed out successfully.', { toastId: 'auth-signout' });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!localStorage.getItem('jwt')) {
      setLoading(false);
      return;
    }
    try {
      const res = await authApi.getMe();
      if (res.data) {
        const updatedUser = {
          id: res.data.id,
          name: res.data.name,
          email: res.data.email,
          role: res.data.role,
          venueId: res.data.venueId,
          venueName: res.data.venueName,
          venueSlug: res.data.venueSlug,
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('role', res.data.role || '');
      }
    } catch (err) {
      // Handled by client interceptor if token expired
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();

    const handleAuthChange = () => syncAuthState();
    const handleStorage = (e) => {
      if (e.key === 'jwt' || e.key === 'user') {
        syncAuthState();
      }
    };
    const handleJwtExpired = () => {
      logout({ explicit: false });
      toast.error('Session expired. Please sign in again.', { toastId: 'session-expired' });
    };

    window.addEventListener('auth_changed', handleAuthChange);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('jwt_expired', handleJwtExpired);

    return () => {
      window.removeEventListener('auth_changed', handleAuthChange);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('jwt_expired', handleJwtExpired);
    };
  }, [refreshProfile, logout, syncAuthState]);

  const role = user?.role || localStorage.getItem('role') || null;
  const isAdmin = role === 'ADMIN';
  const isCoordinator = role === 'COORDINATOR' || role === 'DOCTOR';
  const isSecurity = role === 'SECURITY';
  const isStaffNurse = role === 'STAFF';
  const isStaff = !!role;

  const value = {
    jwt,
    user,
    role,
    loading,
    isAuthenticated: !!jwt,
    isAdmin,
    isCoordinator,
    isSecurity,
    isStaffNurse,
    isStaff,
    loginWithJwtResponse,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
