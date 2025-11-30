import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { gameApi, DailyStatus, IPOStatus } from '../api/game';
import { DailyRewardModal } from './DailyRewardModal';
import { PremiumBadge } from './PremiumBadge';
import { UpgradeButton } from './UpgradeButton';
import { AnimatedCounter, ToastContainer, useToast } from './ui';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { stats, refreshStats } = useGameStore();
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [ipoStatus, setIpoStatus] = useState<IPOStatus | null>(null);

  // Fetch daily reward status and IPO status on mount
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const [dailyRes, ipoRes] = await Promise.all([
          gameApi.getDailyStatus(),
          gameApi.getIPOStatus(),
        ]);

        if (dailyRes.success && dailyRes.data) {
          setDailyStatus(dailyRes.data);
          // Auto-open modal if reward is available
          if (dailyRes.data.canClaim) {
            setShowDailyModal(true);
          }
        }

        if (ipoRes.success && ipoRes.data) {
          setIpoStatus(ipoRes.data);
        }
      } catch {
        // Silently fail - not critical
      }
    };
    fetchStatuses();
  }, []);

  // Poll for IPO status updates when active
  useEffect(() => {
    if (!ipoStatus) return;

    const interval = setInterval(async () => {
      try {
        const res = await gameApi.getIPOStatus();
        if (res.success) {
          setIpoStatus(res.data || null);
        }
      } catch {
        // Silently fail
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [ipoStatus]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDailyClaim = () => {
    // Refresh stats after claiming reward
    refreshStats();
    // Refresh daily status
    gameApi.getDailyStatus().then((res) => {
      if (res.success && res.data) {
        setDailyStatus(res.data);
      }
    });
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/properties', label: 'Properties', icon: '🏢' },
    { path: '/businesses', label: 'Businesses', icon: '💼' },
    { path: '/stats', label: 'Stats', icon: '📊' },
    { path: '/prestige', label: 'Go Public', icon: '🚀' },
    { path: '/stocks', label: 'Stocks', icon: '📈' },
    // TODO: Friends and Clubs will be separate microservices - re-enable when ready
    // { path: '/friends', label: 'Friends', icon: '👥' },
    // { path: '/clubs', label: 'Clubs', icon: '🏛️' },
    { path: '/leaderboards', label: 'Rankings', icon: '🏆' },
    { path: '/achievements', label: 'Achievements', icon: '🎖️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-mint-600 dark:text-mint-400">The Mint</span>
            </Link>

            {/* Stats Bar */}
            {stats && (
              <div className="hidden md:flex items-center space-x-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cash</p>
                  <AnimatedCounter
                    value={parseFloat(stats.cash)}
                    className="text-lg font-bold text-mint-600 dark:text-mint-400"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Income/hr</p>
                  <AnimatedCounter
                    value={parseFloat(stats.effectiveIncomeHour)}
                    prefix="+"
                    className="text-lg font-bold text-green-600 dark:text-green-400"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Level</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats.playerLevel}</p>
                </div>
              </div>
            )}

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* IPO Status Indicator */}
              {ipoStatus && (
                <Link
                  to="/prestige"
                  className={`relative flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    ipoStatus.percentChange >= 0
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  <span>📈</span>
                  <span className="font-mono">${ipoStatus.tickerSymbol}</span>
                  <span
                    className={`text-xs font-bold ${
                      ipoStatus.percentChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {ipoStatus.percentChange >= 0 ? '+' : ''}
                    {ipoStatus.percentChange.toFixed(1)}%
                  </span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse"></span>
                </Link>
              )}

              {/* Daily Reward Button */}
              <button
                onClick={() => setShowDailyModal(true)}
                className={`relative flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  dailyStatus?.canClaim
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 animate-pulse'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>🎁</span>
                <span className="hidden sm:inline">Daily</span>
                {dailyStatus?.canClaim && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                )}
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">{user?.username}</span>
                {user?.isPremium ? (
                  <PremiumBadge size="sm" />
                ) : (
                  <UpgradeButton size="sm" />
                )}
              </div>
              <Link
                to="/settings"
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'border-mint-500 text-mint-600 dark:text-mint-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Stats */}
      {stats && (
        <div className="md:hidden bg-mint-50 dark:bg-gray-800 border-b border-mint-100 dark:border-gray-700 px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <AnimatedCounter
              value={parseFloat(stats.cash)}
              className="font-bold text-mint-700 dark:text-mint-400"
            />
            <AnimatedCounter
              value={parseFloat(stats.effectiveIncomeHour)}
              prefix="+"
              suffix="/hr"
              className="text-green-600 dark:text-green-400"
            />
            <span className="text-purple-600 dark:text-purple-400">Lv. {stats.playerLevel}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      {/* Daily Reward Modal */}
      <DailyRewardModal
        isOpen={showDailyModal}
        onClose={() => setShowDailyModal(false)}
        onClaim={handleDailyClaim}
      />

      {/* Toast Notifications */}
      <ToastNotifications />
    </div>
  );
}

// Toast wrapper component
function ToastNotifications() {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}
