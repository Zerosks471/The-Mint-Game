import { useEffect, useState, useMemo } from 'react';
import {
  gameApi,
  AchievementWithProgress,
  AchievementSummary,
} from '../api/game';
import { formatCurrency } from '@mint/utils';

type CategoryFilter = 'all' | string;
type SortOption = 'default' | 'progress' | 'points' | 'unlocked';

const TIER_CONFIG = {
  bronze: {
    gradient: 'from-amber-700 to-amber-800',
    bg: 'bg-amber-900/20',
    border: 'border-amber-700/30',
    text: 'text-amber-600',
    badge: '🥉',
    glow: 'shadow-amber-900/20',
  },
  silver: {
    gradient: 'from-zinc-400 to-zinc-500',
    bg: 'bg-zinc-700/20',
    border: 'border-zinc-500/30',
    text: 'text-zinc-400',
    badge: '🥈',
    glow: 'shadow-zinc-500/20',
  },
  gold: {
    gradient: 'from-amber-400 to-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-400/30',
    text: 'text-amber',
    badge: '🥇',
    glow: 'shadow-amber-500/30',
  },
  platinum: {
    gradient: 'from-cyan-400 to-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-400/30',
    text: 'text-cyan',
    badge: '💎',
    glow: 'shadow-cyan-500/30',
  },
  diamond: {
    gradient: 'from-purple-400 to-pink-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-400/30',
    text: 'text-purple',
    badge: '👑',
    glow: 'shadow-purple-500/30',
  },
};

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  wealth: { icon: '💰', label: 'Wealth', color: 'text-mint' },
  property: { icon: '🏠', label: 'Properties', color: 'text-blue' },
  business: { icon: '🏢', label: 'Businesses', color: 'text-purple' },
  income: { icon: '📈', label: 'Income', color: 'text-cyan' },
  prestige: { icon: '⭐', label: 'Prestige', color: 'text-amber' },
  streak: { icon: '🔥', label: 'Streaks', color: 'text-orange-400' },
  level: { icon: '🎮', label: 'Levels', color: 'text-pink' },
};

export function AchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [summary, setSummary] = useState<AchievementSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [error, setError] = useState<string | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [achievementsRes, summaryRes] = await Promise.all([
          gameApi.getAchievements(),
          gameApi.getAchievementSummary(),
        ]);

        if (achievementsRes.success && achievementsRes.data) {
          setAchievements(achievementsRes.data);
        }
        if (summaryRes.success && summaryRes.data) {
          setSummary(summaryRes.data);
        }
      } catch {
        setError('Failed to load achievements');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCheckAchievements = async () => {
    setIsChecking(true);
    try {
      const result = await gameApi.checkAchievements();
      if (result.success && result.data && result.data.newlyUnlocked.length > 0) {
        setNewlyUnlocked(result.data.newlyUnlocked.map((a) => a.id));

        const [achievementsRes, summaryRes] = await Promise.all([
          gameApi.getAchievements(),
          gameApi.getAchievementSummary(),
        ]);

        if (achievementsRes.success && achievementsRes.data) {
          setAchievements(achievementsRes.data);
        }
        if (summaryRes.success && summaryRes.data) {
          setSummary(summaryRes.data);
        }

        setTimeout(() => setNewlyUnlocked([]), 3000);
      }
    } catch {
      setError('Failed to check achievements');
    } finally {
      setIsChecking(false);
    }
  };

  const categories = useMemo(() => {
    return Array.from(new Set(achievements.map((a) => a.category)));
  }, [achievements]);

  const filteredAndSortedAchievements = useMemo(() => {
    let filtered = achievements.filter((a) => {
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      if (showUnlockedOnly && !a.isUnlocked) return false;
      return true;
    });

    switch (sortBy) {
      case 'progress':
        filtered = [...filtered].sort((a, b) => b.progressPercent - a.progressPercent);
        break;
      case 'points':
        filtered = [...filtered].sort((a, b) => b.points - a.points);
        break;
      case 'unlocked':
        filtered = [...filtered].sort((a, b) => {
          if (a.isUnlocked && !b.isUnlocked) return -1;
          if (!a.isUnlocked && b.isUnlocked) return 1;
          return 0;
        });
        break;
    }

    return filtered;
  }, [achievements, categoryFilter, showUnlockedOnly, sortBy]);

  const groupedAchievements = useMemo(() => {
    return filteredAndSortedAchievements.reduce(
      (acc, achievement) => {
        const category = achievement.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(achievement);
        return acc;
      },
      {} as Record<string, AchievementWithProgress[]>
    );
  }, [filteredAndSortedAchievements]);

  const completionPercentage = summary
    ? Math.round((summary.unlockedCount / summary.totalAchievements) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
            <span className="text-3xl">🏅</span>
            Achievements
          </h1>
          <p className="text-zinc-400 mt-1">Complete challenges to earn rewards</p>
        </div>
        <button
          onClick={handleCheckAchievements}
          disabled={isChecking}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-dark-base font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-amber/20"
        >
          <svg className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {isChecking ? 'Checking...' : 'Check Progress'}
        </button>
      </div>

      {/* Summary Card */}
      {summary && (
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-dark-card to-dark-elevated border border-amber-500/20 rounded-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Progress Ring */}
              <div className="col-span-2 lg:col-span-1 flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-dark-border"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${completionPercentage * 3.52} 352`}
                      strokeLinecap="round"
                      className="text-amber transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-amber">{completionPercentage}%</span>
                    <span className="text-xs text-zinc-500">Complete</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-col justify-center">
                <p className="text-4xl font-bold text-zinc-100">
                  {summary.unlockedCount}
                  <span className="text-lg text-zinc-500">/{summary.totalAchievements}</span>
                </p>
                <p className="text-sm text-zinc-500 mt-1">Achievements Unlocked</p>
              </div>

              <div className="flex flex-col justify-center">
                <p className="text-4xl font-bold text-amber font-mono">
                  {summary.earnedPoints.toLocaleString()}
                </p>
                <p className="text-sm text-zinc-500 mt-1">Points Earned</p>
              </div>

              <div className="flex flex-col justify-center">
                <p className="text-4xl font-bold text-mint font-mono">
                  {summary.totalPoints.toLocaleString()}
                </p>
                <p className="text-sm text-zinc-500 mt-1">Total Available</p>
              </div>
            </div>

            {/* Category Progress */}
            <div className="mt-6 pt-6 border-t border-dark-border">
              <p className="text-sm font-medium text-zinc-400 mb-3">Progress by Category</p>
              <div className="flex flex-wrap gap-2">
                {summary.categories.map((cat) => {
                  const config = CATEGORY_CONFIG[cat.name] || { icon: '🏆', label: cat.name, color: 'text-zinc-400' };
                  const progress = Math.round((cat.unlocked / cat.total) * 100);
                  return (
                    <div
                      key={cat.name}
                      className="flex items-center gap-2 px-3 py-2 bg-dark-elevated rounded-xl border border-dark-border"
                    >
                      <span>{config.icon}</span>
                      <span className={`text-sm font-medium ${config.color}`}>
                        {cat.unlocked}/{cat.total}
                      </span>
                      <div className="w-16 h-1.5 bg-dark-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-mint rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-dark-card border border-dark-border rounded-xl">
        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-500">Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-mint focus:border-mint outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => {
              const config = CATEGORY_CONFIG[cat] || { icon: '🏆', label: cat };
              return (
                <option key={cat} value={cat}>
                  {config.icon} {config.label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-500">Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-mint focus:border-mint outline-none"
          >
            <option value="default">Default</option>
            <option value="progress">By Progress</option>
            <option value="points">By Points</option>
            <option value="unlocked">Unlocked First</option>
          </select>
        </div>

        {/* Toggle */}
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <div className="relative">
            <input
              type="checkbox"
              checked={showUnlockedOnly}
              onChange={(e) => setShowUnlockedOnly(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-10 h-6 rounded-full transition-colors ${showUnlockedOnly ? 'bg-mint' : 'bg-dark-border'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${showUnlockedOnly ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
          </div>
          <span className="text-sm text-zinc-400">Unlocked only</span>
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber border-t-transparent mb-4"></div>
          <p className="text-zinc-500">Loading achievements...</p>
        </div>
      ) : filteredAndSortedAchievements.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-zinc-400 text-lg">No achievements found</p>
          <p className="text-zinc-500 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => {
            const config = CATEGORY_CONFIG[category] || { icon: '🏆', label: category, color: 'text-zinc-400' };
            const unlockedCount = categoryAchievements.filter((a) => a.isUnlocked).length;

            return (
              <div key={category}>
                {/* Category Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="flex items-center gap-3 text-lg font-bold text-zinc-100">
                    <span className="text-2xl">{config.icon}</span>
                    {config.label}
                    <span className="text-sm font-normal text-zinc-500 bg-dark-elevated px-2 py-0.5 rounded-full">
                      {unlockedCount}/{categoryAchievements.length}
                    </span>
                  </h2>
                </div>

                {/* Achievement Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAchievements.map((achievement) => {
                    const tier = TIER_CONFIG[achievement.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.bronze;
                    const isNewlyUnlocked = newlyUnlocked.includes(achievement.id);

                    return (
                      <div
                        key={achievement.id}
                        className={`
                          relative overflow-hidden rounded-2xl border transition-all duration-300
                          ${achievement.isUnlocked
                            ? `${tier.bg} ${tier.border} shadow-lg ${tier.glow}`
                            : 'bg-dark-card border-dark-border opacity-70'
                          }
                          ${isNewlyUnlocked ? 'ring-2 ring-amber animate-pulse' : ''}
                        `}
                      >
                        {/* Tier Header */}
                        <div className={`bg-gradient-to-r ${tier.gradient} px-4 py-2 flex items-center justify-between`}>
                          <span className="text-white text-sm font-medium capitalize flex items-center gap-2">
                            <span>{tier.badge}</span>
                            {achievement.tier}
                          </span>
                          <span className="text-white/80 text-sm font-bold">
                            +{achievement.points} pts
                          </span>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <h3 className="font-bold text-zinc-100 mb-1">{achievement.name}</h3>
                          <p className="text-sm text-zinc-400 mb-4">{achievement.description}</p>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-zinc-500">Progress</span>
                              <span className={achievement.isUnlocked ? tier.text : 'text-zinc-400'}>
                                {achievement.progressPercent}%
                              </span>
                            </div>
                            <div className="h-2 bg-dark-border rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  achievement.isUnlocked
                                    ? `bg-gradient-to-r ${tier.gradient}`
                                    : 'bg-zinc-600'
                                }`}
                                style={{ width: `${achievement.progressPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Reward */}
                          {parseFloat(achievement.rewardCash) > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-zinc-500">Reward:</span>
                              <span className="font-medium text-mint">
                                {formatCurrency(parseFloat(achievement.rewardCash))}
                              </span>
                            </div>
                          )}

                          {/* Unlocked Date */}
                          {achievement.isUnlocked && achievement.unlockedAt && (
                            <div className="mt-3 pt-3 border-t border-dark-border text-xs text-zinc-500 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Unlocked Badge */}
                        {achievement.isUnlocked && (
                          <div className="absolute top-12 -right-8 rotate-45 bg-mint text-dark-base text-xs font-bold px-10 py-1">
                            UNLOCKED
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
