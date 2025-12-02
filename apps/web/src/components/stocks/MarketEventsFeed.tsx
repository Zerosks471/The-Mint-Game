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
        title = `${event.tickerSymbol} surging`;
        severity = 'high';
        break;
      case 'dump':
        type = 'dump';
        title = `${event.tickerSymbol} crashing`;
        severity = 'high';
        break;
      case 'news_positive':
        type = 'news';
        title = `Good news: ${event.tickerSymbol}`;
        severity = 'medium';
        break;
      case 'news_negative':
        type = 'news';
        title = `Bad news: ${event.tickerSymbol}`;
        severity = 'medium';
        break;
    }

    return {
      id: `${event.tickerSymbol}-${index}`,
      type,
      title,
      description: `${(event.magnitude * 100).toFixed(1)}% impact`,
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
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [maxEvents]);

  const getEventIcon = (type: MarketEvent['type']) => {
    switch (type) {
      case 'pump': return '↑';
      case 'dump': return '↓';
      case 'news': return '•';
      case 'halt': return '⏸';
      default: return '•';
    }
  };

  const getEventColor = (type: MarketEvent['type']) => {
    switch (type) {
      case 'pump': return 'text-green-400';
      case 'dump': return 'text-red-400';
      case 'news': return 'text-cyan-400';
      case 'halt': return 'text-yellow-400';
      default: return 'text-zinc-400';
    }
  };

  const getTimeRemaining = (expiresAt: Date): string => {
    const diff = expiresAt.getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  if (isLoading) {
    return (
      <div className="cyberpunk-card p-4">
        <div className="flex items-center justify-center py-6">
          <div className="cyberpunk-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="cyberpunk-card overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Events</h3>
        <span className="text-xs text-zinc-500">Live</span>
      </div>

      <div className="max-h-[300px] overflow-y-auto cyberpunk-scrollbar">
        {events.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-zinc-500 text-sm">No active events</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {events.map((event) => (
              <div
                key={event.id}
                className="px-4 py-3 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                onClick={() => onTickerClick?.(event.affectedTickers[0])}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getEventColor(event.type)}`}>
                    {getEventIcon(event.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{event.title}</p>
                    <p className="text-xs text-zinc-500">{event.description}</p>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">
                    {getTimeRemaining(event.expiresAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
