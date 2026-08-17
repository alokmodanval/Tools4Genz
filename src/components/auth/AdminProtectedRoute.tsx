import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authStore, AdminUser } from '@/services/adminService';

interface AdminProtectedRouteProps {
  children?: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(authStore.currentUser);

  useEffect(() => {
    let isMounted = true;

    // Check with server-side /api/auth/me
    authStore.me().then((verifiedUser) => {
      if (isMounted) {
        setUser(verifiedUser);
        setChecking(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600"></div>
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Verifying Admin Authorization...
          </span>
        </div>
      </div>
    );
  }

  if (!user || user.status !== 'active') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : null;
};

export default AdminProtectedRoute;
