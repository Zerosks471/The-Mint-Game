import { useState, useEffect } from 'react';
import { gameApi, MarketEvent as ApiMarketEvent } from '../../api/game';

interface MarketEvent {
  id: string;
  type: 'news' | 'halt' | 'player_action' | 'pump' | 'dump';
  title: string;
  description: string;
  affectedTickers: string[];
  timestamp: Date;
  expiresAt: Date;
  severity: 'low' | 'medium' | 'high';
}

interface MarketEventsFeedProps {
  onTickerClick?: (ticker: string) => void;
  maxEvents?: number;
}

// Convert API market events to our extended format
function convertApiEvents(apiEvents: ApiMarketEvent[]): MarketEvent[] {
  return apiEvents.map((event, index) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + event.remainingMs);

    let type: MarketEvent['type'] = 'news';
    let title = '';
    let severity: MarketEvent['severity'] = 'medium';

    switch (event.type) {
      case 'pump':
        type = 'pump';
        title = `${event.tickerSymbol} is surging!`;
        severity = 'high';
        break;
      case 'dump':
        type = 'dump';
        title = `${event.tickerSymbol} is crashing!`;
        severity = 'high';
        break;
      case 'news_positive':
        type = 'news';
        title = `Positive news for ${event.tickerSymbol}`;
        severity = 'medium';
        break;
      case 'news_negative':
        type = 'news';
        title = `Negative news for ${event.tickerSymbol}`;
        severity = 'medium';
        break;
    }

    return {
      id: `${event.tickerSymbol}-${index}`,
      type,
      title,
      description: `Market activity detected with ${(event.magnitude * 100).toFixed(1)}% impact`,
      affectedTickers: [event.tickerSymbol],
      timestamp: new Date(now.getTime() - (300000 - event.remainingMs)),
      expiresAt,
      severity,
    };
  });
}

export function MarketEventsFeed({ onTickerClick, maxEvents = 10 }: MarketEventsFeedProps) {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const res = await gameApi.getMarketSummary();
      if (res.success && res.data?.activeEvents) {
        const convertedEvents = convertApiEvents(res.data.activeEvents);
        setEvents(convertedEvents.slice(0, maxEvents));
      }
    } catch (err) {
      console.error('Failed to fetch market events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [maxEvents]);

  const getEventBadge = (type: MarketEvent['type']) => {
    switch (type) {
      case 'news':
        return { icon: '📰', label: 'News', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'halt':
        return { icon: '⛔', label: 'Halt', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
      case 'player_action':
        return { icon: '👤', label: 'Player', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'pump':
        return { icon: '🚀', label: 'Pump', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'dump':
        return { icon: '💥', label: 'Dump', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
      default:
        return { icon: '📊', label: 'Event', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' };
    }
  };

  const getTimeRemaining = (expiresAt: Date): string => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  if (isLoading) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-border bg-dark-bg flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-mint animate-pulse" />
          Market Events
        </h3>
        <span className="text-xs text-zinc-500">Auto-refresh: 30s</span>
      </div>

      {/* Events List */}
      <div className="divide-y divide-dark-border max-h-[500px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-4xl mb-2 block">📊</span>
            <p className="text-zinc-400 text-sm">No active market events</p>
            <p className="text-zinc-500 text-xs mt-1">Events will appear here as they happen</p>
          </div>
        ) : (
          events.map((event) => {
            const badge = getEventBadge(event.type);
            const timeRemaining = getTimeRemaining(event.expiresAt);
            const isExpiring = event.expiresAt.getTime() - Date.now() < 60000; // Less than 1 minute

            return (
              <div
                key={event.id}
                className="p-4 hover:bg-dark-bg transition-colors"
              >
                {/* Event Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xl">{badge.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-zinc-100 text-sm">{event.title}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">{getTimeAgo(event.timestamp)}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded font-bold border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Event Description */}
                <p className="text-sm text-zinc-400 mb-2">{event.description}</p>

                {/* Affected Tickers */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs text-zinc-500">Affected:</span>
                  {event.affectedTickers.map((ticker) => (
                    <button
                      key={ticker}
                      onClick={() => onTickerClick?.(ticker)}
                      className="text-xs font-bold px-2 py-1 bg-mint/10 text-mint border border-mint/30 rounded hover:bg-mint/20 transition-colors"
                    >
                      {ticker}
                    </button>
                  ))}
                </div>

                {/* Expiration Indicator */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-dark-border">
                  <span className="text-xs text-zinc-500">Expires in:</span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      isExpiring ? 'text-red-400 animate-pulse' : 'text-zinc-400'
                    }`}
                  >
                    {timeRemaining}
                  </span>
                </div>

                {/* Progress bar */}
                {timeRemaining !== 'Expired' && (
                  <div className="mt-2 h-1 bg-dark-bg rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        isExpiring ? 'bg-red-500' : 'bg-mint'
                      }`}
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            ((event.expiresAt.getTime() - Date.now()) / 300000) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
