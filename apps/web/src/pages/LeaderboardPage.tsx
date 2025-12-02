import { useEffect, useState } from 'react';
import {
  gameApi,
  LeaderboardResponse,
  LeaderboardType,
  PlayerRankResponse,
} from '../api/game';
import { formatCurrency } from '@mint/utils';
import { PremiumBadge } from '../components/PremiumBadge';
import { PlayerAvatar } from '../components/PlayerAvatar';

// Badge emojis
const BADGE_EMOJIS: Record<string, string> = {
  badge_newbie: '🌱',
  badge_trader: '📈',
  badge_whale: '🐋',
  badge_vip: '⭐',
  badge_founder: '🏆',
};

// Leaderboard type icons
const TYPE_ICONS: Record<string, string> = {
  global_net_worth: '💰',
  global_income: '📈',
  weekly_earnings: '📅',
};

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

  const formatScore = (score: string, _type: string): string => {
    const num = parseFloat(score);
    return formatCurrency(num);
  };

  const getRankChange = (current: number, previous: number | null): JSX.Element | null => {
    if (previous === null) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan bg-cyan/10 px-2 py-0.5 rounded-full">
          NEW
        </span>
      );
    }

    const diff = previous - current;
    if (diff > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-mint">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          {diff}
        </span>
      );
    } else if (diff < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          {Math.abs(diff)}
        </span>
      );
    }
    return <span className="text-xs text-zinc-500">—</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            Leaderboards
          </h1>
          <p className="text-zinc-400 mt-1">Compete with players worldwide</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-mint hover:bg-mint-600 text-dark-base font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-mint/20"
        >
          <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Your Rank Card */}
      {myRank && (
        <div className="relative overflow-hidden bg-gradient-to-br from-dark-card to-dark-elevated border border-dark-border rounded-2xl">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-mint/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative p-6">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Your Standing</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Rank */}
              <div className="text-center md:text-left">
                <div className="text-5xl font-bold mb-1">
                  {myRank.rank ? (
                    myRank.rank <= 3 ? (
                      <span className={`
                        ${myRank.rank === 1 ? 'text-amber' : ''}
                        ${myRank.rank === 2 ? 'text-zinc-300' : ''}
                        ${myRank.rank === 3 ? 'text-amber-600' : ''}
                      `}>
                        {myRank.rank === 1 ? '🥇' : myRank.rank === 2 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="text-mint font-mono">#{myRank.rank}</span>
                    )
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </div>
                <p className="text-sm text-zinc-500">Current Rank</p>
              </div>

              {/* Score */}
              <div className="text-center md:text-left">
                <p className="text-2xl font-bold text-zinc-100 font-mono mb-1">
                  {myRank.score ? formatScore(myRank.score, activeType) : '—'}
                </p>
                <p className="text-sm text-zinc-500">Your Score</p>
              </div>

              {/* Percentile */}
              <div className="text-center md:text-left">
                <p className="text-2xl font-bold text-cyan font-mono mb-1">
                  {myRank.percentile ? `Top ${Math.max(1, 100 - myRank.percentile + 1)}%` : '—'}
                </p>
                <p className="text-sm text-zinc-500">Percentile</p>
              </div>

              {/* Total Players */}
              <div className="text-center md:text-left">
                <p className="text-2xl font-bold text-purple font-mono mb-1">
                  {myRank.totalPlayers?.toLocaleString() || '—'}
                </p>
                <p className="text-sm text-zinc-500">Total Players</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => setActiveType(type.id)}
            className={`
              inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
              ${activeType === type.id
                ? 'bg-mint/10 text-mint border border-mint/30 shadow-lg shadow-mint/10'
                : 'bg-dark-card border border-dark-border text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              }
            `}
          >
            <span>{TYPE_ICONS[type.id] || '📊'}</span>
            {type.name}
          </button>
        ))}
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
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-mint border-t-transparent mb-4"></div>
          <p className="text-zinc-500">Loading rankings...</p>
        </div>
      ) : leaderboard ? (
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          {/* Top 3 Podium */}
          {leaderboard.entries.length >= 3 && (
            <div className="p-6 bg-gradient-to-b from-dark-elevated to-transparent border-b border-dark-border">
              <div className="flex items-end justify-center gap-4">
                {/* 2nd Place */}
                <div className="flex flex-col items-center w-28">
                  <PlayerAvatar
                    avatarId={leaderboard.entries[1]?.avatarId}
                    frameId={leaderboard.entries[1]?.avatarFrameId}
                    previewUrl={leaderboard.entries[1]?.avatarPreviewUrl}
                    size="lg"
                  />
                  <div className="mt-2 text-center">
                    <p className="text-3xl">🥈</p>
                    <p className="font-semibold text-zinc-200 truncate max-w-full">
                      {leaderboard.entries[1]?.displayName || leaderboard.entries[1]?.username || 'Player'}
                    </p>
                    <p className="text-sm text-zinc-400 font-mono">
                      {formatScore(leaderboard.entries[1]?.score || '0', activeType)}
                    </p>
                  </div>
                  <div className="w-full h-16 bg-zinc-600/30 rounded-t-lg mt-2" />
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center w-32">
                  <div className="relative">
                    <PlayerAvatar
                      avatarId={leaderboard.entries[0]?.avatarId}
                      frameId={leaderboard.entries[0]?.avatarFrameId}
                      previewUrl={leaderboard.entries[0]?.avatarPreviewUrl}
                      size="xl"
                    />
                    <div className="absolute -top-2 -right-2 text-2xl animate-bounce">👑</div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-4xl">🥇</p>
                    <p className="font-bold text-amber truncate max-w-full">
                      {leaderboard.entries[0]?.displayName || leaderboard.entries[0]?.username || 'Player'}
                    </p>
                    <p className="text-sm text-amber/80 font-mono font-semibold">
                      {formatScore(leaderboard.entries[0]?.score || '0', activeType)}
                    </p>
                  </div>
                  <div className="w-full h-24 bg-amber/20 rounded-t-lg mt-2" />
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center w-28">
                  <PlayerAvatar
                    avatarId={leaderboard.entries[2]?.avatarId}
                    frameId={leaderboard.entries[2]?.avatarFrameId}
                    previewUrl={leaderboard.entries[2]?.avatarPreviewUrl}
                    size="lg"
                  />
                  <div className="mt-2 text-center">
                    <p className="text-3xl">🥉</p>
                    <p className="font-semibold text-zinc-200 truncate max-w-full">
                      {leaderboard.entries[2]?.displayName || leaderboard.entries[2]?.username || 'Player'}
                    </p>
                    <p className="text-sm text-zinc-400 font-mono">
                      {formatScore(leaderboard.entries[2]?.score || '0', activeType)}
                    </p>
                  </div>
                  <div className="w-full h-12 bg-amber-700/20 rounded-t-lg mt-2" />
                </div>
              </div>
            </div>
          )}

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-dark-elevated/50 border-b border-dark-border font-medium text-zinc-500 text-xs uppercase tracking-wider">
            <div className="col-span-1">Rank</div>
            <div className="col-span-1">Trend</div>
            <div className="col-span-6">Player</div>
            <div className="col-span-4 text-right">{leaderboard.name}</div>
          </div>

          {/* Entries */}
          {leaderboard.entries.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="text-5xl mb-4">🏆</div>
              <p className="text-zinc-400 text-lg">No players on the leaderboard yet.</p>
              <p className="text-zinc-500 text-sm mt-1">Be the first to claim the top spot!</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-border/50">
              {leaderboard.entries.slice(3).map((entry) => (
                <div
                  key={entry.userId}
                  className={`
                    grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors
                    ${entry.isCurrentUser
                      ? 'bg-mint/5 border-l-2 border-l-mint'
                      : 'hover:bg-dark-elevated/50'
                    }
                  `}
                >
                  <div className="col-span-1">
                    <span className="text-lg font-bold text-zinc-400 font-mono">
                      #{entry.rank}
                    </span>
                  </div>
                  <div className="col-span-1">
                    {getRankChange(entry.rank, entry.previousRank)}
                  </div>
                  <div className="col-span-6 flex items-center gap-3">
                    <PlayerAvatar
                      avatarId={entry.avatarId}
                      frameId={entry.avatarFrameId}
                      previewUrl={entry.avatarPreviewUrl}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className={`font-medium flex items-center gap-1.5 ${entry.isCurrentUser ? 'text-mint' : 'text-zinc-100'}`}>
                        <span className="truncate">
                          {entry.displayName || entry.username || 'Anonymous'}
                        </span>
                        {entry.badgeId && (
                          <span title={entry.badgeId.replace('badge_', '').replace('_', ' ')}>
                            {BADGE_EMOJIS[entry.badgeId] || ''}
                          </span>
                        )}
                        {entry.isPremium && <PremiumBadge size="sm" />}
                        {entry.isCurrentUser && (
                          <span className="ml-1 text-xs bg-mint/20 text-mint px-2 py-0.5 rounded-full font-medium">
                            You
                          </span>
                        )}
                      </p>
                      {entry.displayName && entry.username && (
                        <p className="text-sm text-zinc-500">@{entry.username}</p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-4 text-right">
                    <span className="font-bold text-zinc-100 font-mono">
                      {formatScore(entry.score, activeType)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {leaderboard.lastUpdated && (
            <div className="px-6 py-3 bg-dark-elevated/30 border-t border-dark-border text-xs text-zinc-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Last updated: {new Date(leaderboard.lastUpdated).toLocaleString()}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
