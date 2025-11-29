import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { formatCurrency } from '@mint/utils';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { stats } = useGameStore();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/properties', label: 'Properties', icon: '🏢' },
    { path: '/businesses', label: 'Businesses', icon: '💼' },
    { path: '/stats', label: 'Stats', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-mint-600">The Mint</span>
            </Link>

            {/* Stats Bar */}
            {stats && (
              <div className="hidden md:flex items-center space-x-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Cash</p>
                  <p className="text-lg font-bold text-mint-600">
                    {formatCurrency(parseFloat(stats.cash))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Income/hr</p>
                  <p className="text-lg font-bold text-green-600">
                    +{formatCurrency(parseFloat(stats.effectiveIncomeHour))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Level</p>
                  <p className="text-lg font-bold text-purple-600">{stats.playerLevel}</p>
                </div>
              </div>
            )}

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.username}
                {user?.isPremium && (
                  <span className="ml-1 px-1.5 py-0.5 bg-gold-100 text-gold-700 text-xs rounded-full">
                    Premium
                  </span>
                )}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'border-mint-500 text-mint-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
        <div className="md:hidden bg-mint-50 border-b border-mint-100 px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-mint-700">
              {formatCurrency(parseFloat(stats.cash))}
            </span>
            <span className="text-green-600">
              +{formatCurrency(parseFloat(stats.effectiveIncomeHour))}/hr
            </span>
            <span className="text-purple-600">Lv. {stats.playerLevel}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
