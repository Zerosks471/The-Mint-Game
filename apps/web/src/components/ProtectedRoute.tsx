import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [authVerified, setAuthVerified] = useState(false);

  useEffect(() => {
    const verify = async () => {
      // Always check auth on mount to restore access token from refresh token cookie
      const valid = await checkAuth();
      setAuthVerified(valid);
      setIsChecking(false);
    };
    verify();
  }, [checkAuth]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-mint-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authVerified) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
