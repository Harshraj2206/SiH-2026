import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, isAuthenticated, loading, getRoleDefaultRoute } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-300">
        <div className="w-12 h-12 rounded-tile bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 animate-pulse">
          <ShieldAlert className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Verifying Security Credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    const userRole = currentUser.role?.toUpperCase();
    const hasRole = allowedRoles.map(r => r.toUpperCase()).includes(userRole);

    // ADMIN has supervisor access to all roles
    if (!hasRole && userRole !== 'ADMIN') {
      const fallbackRoute = getRoleDefaultRoute(currentUser.role);
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  return children;
};
