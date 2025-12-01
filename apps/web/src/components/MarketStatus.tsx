import { useEffect, useState } from 'react';

export function MarketStatus({ lastTickAt }: MarketStatusProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Market is always open 24/7

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
    };

    // Update immediately
    updateTime();

    // Then update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0f0f15] border border-[#1a1a24] rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>
    </div>
  );
}

