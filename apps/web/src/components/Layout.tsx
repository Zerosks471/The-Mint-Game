import { ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { gameApi, DailyStatus, IPOStatus } from '../api/game';
import { DailyRewardModal } from './DailyRewardModal';
import { BuyCoinsModal } from './BuyCoinsModal';
import { PremiumBadge } from './PremiumBadge';
import { UpgradeButton } from './UpgradeButton';
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
  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [ipoStatus, setIpoStatus] = useState<IPOStatus | null>(null);
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

  // Fetch daily reward status, IPO status, and portfolio on mount
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const [dailyRes, ipoRes, portfolioRes] = await Promise.all([
          gameApi.getDailyStatus(),
          gameApi.getIPOStatus(),
          gameApi.getPortfolio(),
        ]);

        if (dailyRes.success && dailyRes.data) {
          setDailyStatus(dailyRes.data);
          if (dailyRes.data.canClaim) {
            setShowDailyModal(true);
          }
        }

        if (ipoRes.success && ipoRes.data) {
          setIpoStatus(ipoRes.data);
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

                {/* IPO Status Indicator */}
                {ipoStatus && (
                  <Link
                    to="/stocks"
                    className={`
                      relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                      transition-all duration-200 border
                      ${ipoStatus.percentChange >= 0
                        ? 'bg-mint/10 border-mint/30 text-mint hover:bg-mint/20'
                        : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                      }
                    `}
                  >
                    <span>📈</span>
                    <span className="font-mono">${ipoStatus.tickerSymbol}</span>
                    <span className={`text-xs font-bold ${ipoStatus.percentChange >= 0 ? 'text-mint' : 'text-red-400'}`}>
                      {ipoStatus.percentChange >= 0 ? '+' : ''}{ipoStatus.percentChange.toFixed(1)}%
                    </span>
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple rounded-full animate-pulse" />
                  </Link>
                )}

                {/* Coin Balance Button */}
                {stats && (
                  <button
                    onClick={() => setShowCoinsModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                      bg-amber/10 border border-amber/30 text-amber hover:bg-amber/20 transition-all duration-200"
                    title="Buy Mint Coins"
                  >
                    <span>🪙</span>
                    <span className="font-bold font-mono">{stats.premiumCurrency?.toLocaleString() ?? 0}</span>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {/* Daily Reward Button */}
                <button
                  onClick={() => setShowDailyModal(true)}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                    transition-all duration-200 border
                    ${dailyStatus?.canClaim
                      ? 'bg-amber/10 border-amber/30 text-amber hover:bg-amber/20 animate-pulse'
                      : 'bg-dark-elevated border-dark-border text-zinc-400 hover:bg-dark-border hover:text-zinc-300'
                    }
                  `}
                >
                  <span>🎁</span>
                  <span className="hidden sm:inline">Daily</span>
                  {dailyStatus?.canClaim && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                  )}
                </button>

                {/* User Profile */}
                <Link to="/shop" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <PlayerAvatar
                    avatarId={user?.avatarId}
                    frameId={user?.avatarFrameId}
                    size="sm"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-200">{user?.username}</span>
                    {user?.isPremium ? (
                      <PremiumBadge size="sm" />
                    ) : (
                      <UpgradeButton size="sm" />
                    )}
                  </div>
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

      <BuyCoinsModal
        isOpen={showCoinsModal}
        onClose={() => setShowCoinsModal(false)}
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
