import { useEffect, useState } from 'react';
import {
  gameApi,
  LeaderboardResponse,
  LeaderboardType,
  PlayerRankResponse,
} from '../api/game';
import { formatCurrency } from '@mint/utils';
import { PremiumBadge } from '../components/PremiumBadge';

export function LeaderboardPage() {
  const [types, setTypes] = useState<LeaderboardType[]>([]);
  const [activeType, setActiveType] = useState<string>('global_net_worth');
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [myRank, setMyRank] = useState<PlayerRankResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard types on mount
  useEffect(() => {
    const fetchTypes = async () => {
      const res = await gameApi.getLeaderboardTypes();
      if (res.success && res.data) {
        setTypes(res.data);
      }
    };
    fetchTypes();
  }, []);

  // Fetch leaderboard data when type changes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [boardRes, rankRes] = await Promise.all([
          gameApi.getLeaderboard(activeType),
          gameApi.getMyRank(activeType),
        ]);

        if (boardRes.success && boardRes.data) {
          setLeaderboard(boardRes.data);
        }
        if (rankRes.success && rankRes.data) {
          setMyRank(rankRes.data);
        }
      } catch {
        setError('Failed to load leaderboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeType]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await gameApi.refreshLeaderboards();
      // Refetch data after refresh
      const [boardRes, rankRes] = await Promise.all([
        gameApi.getLeaderboard(activeType),
        gameApi.getMyRank(activeType),
      ]);
      if (boardRes.success && boardRes.data) {
        setLeaderboard(boardRes.data);
      }
      if (rankRes.success && rankRes.data) {
        setMyRank(rankRes.data);
      }
    } catch {
      setError('Failed to refresh leaderboard');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatScore = (score: string, type: string): string => {
    const num = parseFloat(score);
    if (type === 'global_prestige') {
      // For prestige, score = level*1000 + points
      const level = Math.floor(num / 1000);
      const points = num % 1000;
      return `Lv.${level} (${points} PP)`;
    }
    return formatCurrency(num);
  };

  const getRankChange = (current: number, previous: number | null): JSX.Element | null => {
    if (previous === null) return <span className="text-blue-500 text-xs">NEW</span>;

    const diff = previous - current;
    if (diff > 0) {
      return <span className="text-green-500 text-xs">+{diff}</span>;
    } else if (diff < 0) {
      return <span className="text-red-500 text-xs">{diff}</span>;
    }
    return <span className="text-gray-400 text-xs">-</span>;
  };

  const getRankBadge = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboards</h1>
          <p className="text-gray-500">See how you stack up against other players</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh Rankings'}
        </button>
      </div>

      {/* Your Rank Card */}
      {myRank && (
        <div className="bg-gradient-to-r from-mint-500 to-emerald-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-mint-100 text-sm">Your Rank</p>
              <p className="text-4xl font-bold">
                {myRank.rank ? getRankBadge(myRank.rank) : 'Unranked'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-mint-100 text-sm">Score</p>
              <p className="text-2xl font-bold">
                {myRank.score ? formatScore(myRank.score, activeType) : '-'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-mint-100 text-sm">Percentile</p>
              <p className="text-2xl font-bold">
                {myRank.percentile ? `Top ${100 - myRank.percentile + 1}%` : '-'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-mint-100 text-sm">Total Players</p>
              <p className="text-2xl font-bold">{myRank.totalPlayers}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => setActiveType(type.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeType === type.id
                ? 'border-mint-500 text-mint-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {type.name}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-mint-500"></div>
        </div>
      ) : leaderboard ? (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b font-medium text-gray-600 text-sm">
            <div className="col-span-1">Rank</div>
            <div className="col-span-1">Change</div>
            <div className="col-span-6">Player</div>
            <div className="col-span-4 text-right">{leaderboard.name}</div>
          </div>

          {/* Entries */}
          {leaderboard.entries.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No players on the leaderboard yet. Be the first!
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {leaderboard.entries.map((entry) => (
                <div
                  key={entry.userId}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 items-center ${
                    entry.isCurrentUser ? 'bg-mint-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="col-span-1 font-bold text-lg">
                    {entry.rank <= 3 ? (
                      <span className="text-2xl">{getRankBadge(entry.rank)}</span>
                    ) : (
                      <span className="text-gray-600">#{entry.rank}</span>
                    )}
                  </div>
                  <div className="col-span-1">
                    {getRankChange(entry.rank, entry.previousRank)}
                  </div>
                  <div className="col-span-6 flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        entry.isCurrentUser ? 'bg-mint-500' : 'bg-gray-400'
                      }`}
                    >
                      {(entry.displayName || entry.username || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-medium flex items-center gap-1.5 ${entry.isCurrentUser ? 'text-mint-700' : 'text-gray-900'}`}>
                        {entry.displayName || entry.username || 'Anonymous'}
                        {entry.isPremium && <PremiumBadge size="sm" />}
                        {entry.isCurrentUser && (
                          <span className="ml-1 text-xs bg-mint-100 text-mint-700 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </p>
                      {entry.displayName && entry.username && (
                        <p className="text-sm text-gray-500">@{entry.username}</p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-4 text-right">
                    <span className="font-bold text-gray-900">
                      {formatScore(entry.score, activeType)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {leaderboard.lastUpdated && (
            <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500">
              Last updated: {new Date(leaderboard.lastUpdated).toLocaleString()}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
