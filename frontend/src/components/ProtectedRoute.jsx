import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-400 text-lg animate-pulse">Loading authorization...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return (
      <div className="card mx-auto text-center py-12 max-w-lg mt-8">
        <h2 className="text-xl font-bold text-danger mb-2">Access Restricted</h2>
        <p className="text-gray-400 mb-4">
          Your current role (<strong>{role}</strong>) does not have sufficient clearance for this operational section.
        </p>
      </div>
    );
  }

  return children;
}
