import { useEffect, useState } from 'react';
import {
  gameApi,
  AchievementWithProgress,
  AchievementSummary,
} from '../api/game';
import { formatCurrency } from '@mint/utils';

type CategoryFilter = 'all' | string;

export function AchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [summary, setSummary] = useState<AchievementSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  // Fetch achievements on mount
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
        // Mark newly unlocked for animation
        setNewlyUnlocked(result.data.newlyUnlocked.map((a) => a.id));

        // Refetch data
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

        // Clear animation after 3 seconds
        setTimeout(() => setNewlyUnlocked([]), 3000);
      }
    } catch {
      setError('Failed to check achievements');
    } finally {
      setIsChecking(false);
    }
  };

  const getTierColor = (tier: string): string => {
    switch (tier) {
      case 'bronze':
        return 'from-amber-600 to-amber-700';
      case 'silver':
        return 'from-gray-400 to-gray-500';
      case 'gold':
        return 'from-yellow-400 to-yellow-500';
      case 'platinum':
        return 'from-cyan-400 to-cyan-500';
      case 'diamond':
        return 'from-purple-400 to-purple-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getTierBadge = (tier: string): string => {
    switch (tier) {
      case 'bronze':
        return '🥉';
      case 'silver':
        return '🥈';
      case 'gold':
        return '🥇';
      case 'platinum':
        return '💎';
      case 'diamond':
        return '👑';
      default:
        return '⭐';
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'wealth':
        return '💰';
      case 'property':
        return '🏠';
      case 'business':
        return '🏢';
      case 'income':
        return '📈';
      case 'prestige':
        return '⭐';
      case 'streak':
        return '🔥';
      case 'level':
        return '🎮';
      default:
        return '🏆';
    }
  };

  // Get unique categories
  const categories = Array.from(new Set(achievements.map((a) => a.category)));

  // Filter achievements
  const filteredAchievements = achievements.filter((a) => {
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    if (showUnlockedOnly && !a.isUnlocked) return false;
    return true;
  });

  // Group by category for display
  const groupedAchievements = filteredAchievements.reduce(
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Achievements</h1>
          <p className="text-gray-500 dark:text-gray-400">Track your progress and unlock rewards</p>
        </div>
        <button
          onClick={handleCheckAchievements}
          disabled={isChecking}
          className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isChecking ? 'Checking...' : 'Check Achievements'}
        </button>
      </div>

      {/* Summary Card */}
      {summary && (
        <div className="bg-gradient-to-r from-mint-500 to-emerald-500 rounded-xl p-6 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-mint-100 text-sm">Unlocked</p>
              <p className="text-3xl font-bold">
                {summary.unlockedCount} / {summary.totalAchievements}
              </p>
              <div className="mt-2 bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-500"
                  style={{
                    width: `${(summary.unlockedCount / summary.totalAchievements) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <p className="text-mint-100 text-sm">Points Earned</p>
              <p className="text-3xl font-bold">
                {summary.earnedPoints} / {summary.totalPoints}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-mint-100 text-sm mb-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                {summary.categories.map((cat) => (
                  <span
                    key={cat.name}
                    className="px-2 py-1 bg-white/20 rounded text-sm"
                  >
                    {getCategoryIcon(cat.name)} {cat.unlocked}/{cat.total}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showUnlockedOnly}
            onChange={(e) => setShowUnlockedOnly(e.target.checked)}
            className="w-4 h-4 text-mint-500 border-gray-300 dark:border-gray-600 rounded focus:ring-mint-500 bg-white dark:bg-gray-800"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Show unlocked only</span>
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-mint-500"></div>
        </div>
      ) : filteredAchievements.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-500 dark:text-gray-400">
          No achievements found matching your filters.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">{getCategoryIcon(category)}</span>
                {category.charAt(0).toUpperCase() + category.slice(1)}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({categoryAchievements.filter((a) => a.isUnlocked).length}/{categoryAchievements.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
                      achievement.isUnlocked
                        ? 'ring-2 ring-mint-500'
                        : 'opacity-75 grayscale-[30%]'
                    } ${
                      newlyUnlocked.includes(achievement.id)
                        ? 'animate-pulse ring-4 ring-yellow-400'
                        : ''
                    }`}
                  >
                    {/* Header with tier gradient */}
                    <div
                      className={`bg-gradient-to-r ${getTierColor(achievement.tier)} px-4 py-2 flex items-center justify-between`}
                    >
                      <span className="text-white text-sm font-medium capitalize">
                        {achievement.tier}
                      </span>
                      <span className="text-xl">{getTierBadge(achievement.tier)}</span>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-900 dark:text-white">{achievement.name}</h3>
                        <span className="text-sm text-mint-600 dark:text-mint-400 font-medium">
                          +{achievement.points} pts
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{achievement.description}</p>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>Progress</span>
                          <span>{achievement.progressPercent}%</span>
                        </div>
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              achievement.isUnlocked ? 'bg-mint-500' : 'bg-mint-400'
                            }`}
                            style={{ width: `${achievement.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Reward */}
                      {parseFloat(achievement.rewardCash) > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Reward:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(parseFloat(achievement.rewardCash))}
                          </span>
                        </div>
                      )}

                      {/* Unlocked date */}
                      {achievement.isUnlocked && achievement.unlockedAt && (
                        <div className="mt-2 text-xs text-gray-400">
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
