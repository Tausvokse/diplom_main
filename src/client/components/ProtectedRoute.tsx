import React, { useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Role } from '../types';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const location = useLocation();

  const isAuthorized = useMemo(() => {
    if (!isAuthenticated || !user) return false;
    if (allowedRoles && allowedRoles.length > 0) {
      return allowedRoles.includes(user.role);
    }
    return true;
  }, [isAuthenticated, user, allowedRoles]);

  if (!_hasHydrated) {
    // Show nothing or a small loader while waiting for localStorage to load
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAuthorized) {
    // User is logged in but doesn't have the required role
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
