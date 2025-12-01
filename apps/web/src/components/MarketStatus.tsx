import { useEffect, useState } from 'react';

interface MarketStatusProps {
  lastTickAt?: string | Date;
}

const TICK_INTERVAL_MIN_MS = 5 * 60 * 1000; // 5 minutes
const TICK_INTERVAL_MAX_MS = 15 * 60 * 1000; // 15 minutes
const AVG_TICK_INTERVAL_MS = (TICK_INTERVAL_MIN_MS + TICK_INTERVAL_MAX_MS) / 2; // 10 minutes

export function MarketStatus({ lastTickAt }: MarketStatusProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeUntilNextTick, setTimeUntilNextTick] = useState<number | null>(null);

  // Market is always open 24/7

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      
      // Calculate time until next tick
      if (lastTickAt) {
        const lastTick = new Date(lastTickAt);
        const elapsed = now.getTime() - lastTick.getTime();
        const nextTickIn = AVG_TICK_INTERVAL_MS - (elapsed % AVG_TICK_INTERVAL_MS);
        setTimeUntilNextTick(Math.max(0, nextTickIn));
      } else {
        // If no last tick, estimate based on 10-minute intervals from a reference point
        // Use the start of the current hour as reference
        const hourStart = new Date(now);
        hourStart.setMinutes(0, 0, 0);
        const elapsed = now.getTime() - hourStart.getTime();
        const nextTickIn = AVG_TICK_INTERVAL_MS - (elapsed % AVG_TICK_INTERVAL_MS);
        setTimeUntilNextTick(Math.max(0, nextTickIn));
      }
    };

    // Update immediately
    updateTime();

    // Then update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [lastTickAt]);

  const formatTimeUntilTick = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const isMarketOpen = true; // Market is always open in this game

  return (
    <div className="bg-[#0f0f15] border border-[#1a1a24] rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Market Time */}
        <div>
          <p className="text-xs text-zinc-500 uppercase mb-1">Market Time</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <p className="text-lg font-bold text-zinc-100 font-mono">
              {currentTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: true 
              })}
            </p>
          </div>
        </div>

        {/* Market Status */}
        <div>
          <p className="text-xs text-zinc-500 uppercase mb-1">Market Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <p className="text-lg font-bold text-green-400">
              Always Open
            </p>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            24/7 Trading
          </p>
        </div>

        {/* Trading Hours */}
        <div>
          <p className="text-xs text-zinc-500 uppercase mb-1">Trading Hours</p>
          <p className="text-lg font-bold text-zinc-100">
            24/7
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Continuous
          </p>
        </div>

        {/* Next Tick */}
        <div>
          <p className="text-xs text-zinc-500 uppercase mb-1">Next Tick</p>
          <p className="text-lg font-bold text-mint font-mono">
            {timeUntilNextTick !== null ? formatTimeUntilTick(timeUntilNextTick) : '--'}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            (5-15 min intervals)
          </p>
        </div>
      </div>
    </div>
  );
}

