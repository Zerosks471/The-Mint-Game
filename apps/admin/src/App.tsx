import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { UsersPage } from '@/pages/UsersPage';
import { EconomyPage } from '@/pages/EconomyPage';
import { LogsPage } from '@/pages/LogsPage';
import { HealthPage } from '@/pages/HealthPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { StocksPage } from '@/pages/StocksPage';
import { GameConfigPage } from '@/pages/GameConfigPage';
import { CouponsPage } from '@/pages/CouponsPage';
import { SystemPage } from '@/pages/SystemPage';
import { SecurityPage } from '@/pages/SecurityPage';
import { CosmeticsPage } from '@/pages/CosmeticsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/economy" element={<EconomyPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/stocks" element={<StocksPage />} />
                <Route path="/gameconfig" element={<GameConfigPage />} />
                <Route path="/coupons" element={<CouponsPage />} />
                <Route path="/cosmetics" element={<CosmeticsPage />} />
                <Route path="/system" element={<SystemPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/health" element={<HealthPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
