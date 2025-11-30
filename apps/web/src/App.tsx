import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { PropertiesPage } from './pages/PropertiesPage';
import { BusinessesPage } from './pages/BusinessesPage';
import { StatsPage } from './pages/StatsPage';
import { StocksPage } from './pages/StocksPage';
import { PrestigePage } from './pages/PrestigePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { FriendsPage } from './pages/FriendsPage';
import { ClubsPage } from './pages/ClubsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

interface ApiStatus {
  status: string;
  database: boolean;
  timestamp: string;
}

function HomePage() {
  const navigate = useNavigate();
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const checkApiHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ready');
      const data = await response.json();
      setApiStatus({
        status: data.status,
        database: data.checks?.database ?? false,
        timestamp: data.timestamp,
      });
    } catch {
      setApiStatus({
        status: 'error',
        database: false,
        timestamp: new Date().toISOString(),
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    checkApiHealth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-mint-50 to-white">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-display font-bold text-mint-600 mb-4">The Mint</h1>
        <p className="text-xl text-gray-600 mb-8">Build Your Financial Empire. One Click at a Time.</p>

        <div className="space-x-4 mb-8">
          <button
            onClick={() => navigate('/auth')}
            className="px-6 py-3 bg-mint-500 text-white font-semibold rounded-lg hover:bg-mint-600 transition-colors shadow-lg hover:shadow-xl"
          >
            Start Playing
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="px-6 py-3 border-2 border-mint-500 text-mint-600 font-semibold rounded-lg hover:bg-mint-50 transition-colors"
          >
            {showInfo ? 'Hide Info' : 'Learn More'}
          </button>
        </div>

        {showInfo && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 text-left">
            <h2 className="text-xl font-bold text-gray-800 mb-4">About The Mint</h2>
            <ul className="space-y-2 text-gray-600">
              <li>📈 Buy properties and collect passive income</li>
              <li>🏢 Build and manage businesses</li>
              <li>💰 Earn money even while offline</li>
              <li>🏆 Compete on leaderboards</li>
              <li>🎨 Unlock cosmetics and achievements</li>
            </ul>
          </div>
        )}

        {/* API Status Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 inline-block">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">System Status</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${apiStatus?.status === 'ready' ? 'bg-green-500' : apiStatus?.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}
              ></span>
              <span className="text-sm text-gray-600">
                API: {loading ? 'Checking...' : apiStatus?.status || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${apiStatus?.database ? 'bg-green-500' : 'bg-red-500'}`}
              ></span>
              <span className="text-sm text-gray-600">
                Database: {apiStatus?.database ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button
              onClick={checkApiHealth}
              disabled={loading}
              className="text-sm text-mint-600 hover:text-mint-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-400">Phase 1 Complete - Core Game MVP Ready</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/properties"
        element={
          <ProtectedRoute>
            <Layout>
              <PropertiesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/businesses"
        element={
          <ProtectedRoute>
            <Layout>
              <BusinessesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stats"
        element={
          <ProtectedRoute>
            <Layout>
              <StatsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stocks"
        element={
          <ProtectedRoute>
            <Layout>
              <StocksPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/prestige"
        element={
          <ProtectedRoute>
            <Layout>
              <PrestigePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboards"
        element={
          <ProtectedRoute>
            <Layout>
              <LeaderboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/achievements"
        element={
          <ProtectedRoute>
            <Layout>
              <AchievementsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/friends"
        element={
          <ProtectedRoute>
            <Layout>
              <FriendsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clubs"
        element={
          <ProtectedRoute>
            <Layout>
              <ClubsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
