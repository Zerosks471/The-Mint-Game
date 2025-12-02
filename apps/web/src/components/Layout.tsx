import { ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { gameApi, DailyStatus } from '../api/game';
import { DailyRewardModal } from './DailyRewardModal';
import { PlayerAvatar } from './PlayerAvatar';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';
import { AnimatedCounter, ToastContainer, useToast } from './ui';

interface LayoutProps {
  children: ReactNode;
}

interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  profitLoss: number;
  profitLossPercent: number;
  holdingsCount: number;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { stats, playerBusinesses, refreshStats, fetchPlayerBusinesses } = useGameStore();
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [sidebarCollapsed] = useState(false);

  // Calculate business summary
  const businessSummary = playerBusinesses.length > 0 ? {
    count: playerBusinesses.length,
    // Count businesses with completed cycles as pending revenue
    pendingCount: playerBusinesses.filter(b => b.cycleComplete).length,
    // Calculate hourly income: revenue per cycle * (3600 / cycleSeconds)
    totalIncomeHr: playerBusinesses.reduce((sum, b) => {
      const revenuePerCycle = parseFloat(b.currentRevenue || '0');
      const cycleSeconds = b.cycleSeconds || 60;
      const incomePerHour = revenuePerCycle * (3600 / cycleSeconds);
      return sum + incomePerHour;
    }, 0),
  } : null;

  // Fetch daily reward status and portfolio on mount
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const [dailyRes, portfolioRes] = await Promise.all([
          gameApi.getDailyStatus(),
          gameApi.getPortfolio(),
        ]);

        if (dailyRes.success && dailyRes.data) {
          setDailyStatus(dailyRes.data);
          if (dailyRes.data.canClaim) {
            setShowDailyModal(true);
          }
        }

        if (portfolioRes.success && portfolioRes.data) {
          const holdings = portfolioRes.data;
          const totalValue = holdings.reduce((sum, h) => sum + parseFloat(h.currentValue), 0);
          const totalInvested = holdings.reduce((sum, h) => sum + parseFloat(h.totalInvested), 0);
          const profitLoss = totalValue - totalInvested;
          const profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
          setPortfolioSummary({
            totalValue,
            totalInvested,
            profitLoss,
            profitLossPercent,
            holdingsCount: holdings.length,
          });
        }

        // Also fetch businesses
        fetchPlayerBusinesses();
      } catch {
        // Silently fail - not critical
      }
    };
    fetchStatuses();
  }, [fetchPlayerBusinesses]);

  // Poll for IPO status, portfolio, and business updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [ipoRes, portfolioRes] = await Promise.all([
          gameApi.getIPOStatus(),
          gameApi.getPortfolio(),
        ]);

        if (ipoRes.success) {
          setIpoStatus(ipoRes.data || null);
        }

        if (portfolioRes.success && portfolioRes.data) {
          const holdings = portfolioRes.data;
          const totalValue = holdings.reduce((sum, h) => sum + parseFloat(h.currentValue), 0);
          const totalInvested = holdings.reduce((sum, h) => sum + parseFloat(h.totalInvested), 0);
          const profitLoss = totalValue - totalInvested;
          const profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
          setPortfolioSummary({
            totalValue,
            totalInvested,
            profitLoss,
            profitLossPercent,
            holdingsCount: holdings.length,
          });
        }

        // Also refresh businesses
        fetchPlayerBusinesses();
      } catch {
        // Silently fail
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchPlayerBusinesses]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDailyClaim = () => {
    refreshStats();
    gameApi.getDailyStatus().then((res) => {
      if (res.success && res.data) {
        setDailyStatus(res.data);
      }
    });
  };

  return (
    <div className="min-h-screen bg-dark-base">
      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-dark-card/80 backdrop-blur-xl border-b border-dark-border">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Stats Bar */}
              {stats && (
                <div className="flex items-center gap-6">
                  {/* Cash */}
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Cash</span>
                    <AnimatedCounter
                      value={parseFloat(stats.cash)}
                      className="text-lg font-bold text-mint font-mono"
                    />
                  </div>

                  {/* Income/hr */}
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Income/hr</span>
                    <AnimatedCounter
                      value={parseFloat(stats.effectiveIncomeHour)}
                      prefix="+"
                      className="text-lg font-bold text-cyan font-mono"
                    />
                  </div>

                  {/* Divider */}
                  <div className="h-10 w-px bg-dark-border" />

                  {/* Portfolio Value */}
                  {portfolioSummary && portfolioSummary.holdingsCount > 0 && (
                    <Link to="/stocks" className="flex flex-col hover:opacity-80 transition-opacity">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Portfolio</span>
                      <div className="flex items-center gap-2">
                        <AnimatedCounter
                          value={portfolioSummary.totalValue}
                          className="text-lg font-bold text-purple font-mono"
                        />
                        <span className={`text-xs font-bold ${portfolioSummary.profitLoss >= 0 ? 'text-mint' : 'text-red-400'}`}>
                          {portfolioSummary.profitLoss >= 0 ? '↑' : '↓'}
                          {Math.abs(portfolioSummary.profitLossPercent).toFixed(1)}%
                        </span>
                      </div>
                    </Link>
                  )}

                  {/* Businesses */}
                  {businessSummary && (
                    <Link to="/businesses" className="flex flex-col hover:opacity-80 transition-opacity">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
                        Businesses ({businessSummary.count})
                      </span>
                      <div className="flex items-center gap-2">
                        <AnimatedCounter
                          value={businessSummary.totalIncomeHr}
                          prefix="+"
                          suffix="/hr"
                          className="text-lg font-bold text-amber font-mono"
                        />
                        {businessSummary.pendingCount > 0 && (
                          <span className="text-xs text-amber animate-pulse">
                            💰 {businessSummary.pendingCount} ready
                          </span>
                        )}
                      </div>
                    </Link>
                  )}

                  {/* Divider */}
                  <div className="h-10 w-px bg-dark-border" />

                  {/* Level */}
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Level</span>
                    <span className="text-lg font-bold text-pink font-mono">{stats.playerLevel}</span>
                  </div>
                </div>
              )}

              {/* Right Side Actions */}
              <div className="flex items-center gap-4">
                {/* Notifications */}
                <NotificationBell />

                {/* Daily Reward Button */}
                <button
                  onClick={() => setShowDailyModal(true)}
                  className={`
                    relative flex items-center justify-center w-10 h-10 rounded-xl text-lg
                    transition-all duration-200 border
                    ${dailyStatus?.canClaim
                      ? 'bg-amber/10 border-amber/30 text-amber hover:bg-amber/20 animate-pulse'
                      : 'bg-dark-elevated border-dark-border text-zinc-400 hover:bg-dark-border hover:text-zinc-300'
                    }
                  `}
                  title={dailyStatus?.canClaim ? 'Claim Daily Reward!' : 'Daily Reward'}
                >
                  🎁
                  {dailyStatus?.canClaim && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                  )}
                </button>

                {/* User Avatar - Links to Settings */}
                <Link
                  to="/settings"
                  className="hover:opacity-80 transition-opacity"
                  title="Settings"
                >
                  <PlayerAvatar
                    avatarId={user?.avatarId}
                    frameId={user?.avatarFrameId}
                    size="sm"
                  />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Stats Bar */}
        {stats && (
          <div className="md:hidden bg-dark-card border-b border-dark-border px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <AnimatedCounter
                value={parseFloat(stats.cash)}
                className="font-bold text-mint font-mono"
              />
              <AnimatedCounter
                value={parseFloat(stats.effectiveIncomeHour)}
                prefix="+"
                suffix="/hr"
                className="text-cyan font-mono"
              />
              <span className="text-pink font-mono">Lv. {stats.playerLevel}</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Modals */}
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

function ToastNotifications() {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}
