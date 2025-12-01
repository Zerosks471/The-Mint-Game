import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface TopPlayer {
  rank: number;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    isPremium: boolean;
  };
  cash: string;
  playerLevel: number;
  lifetimeCashEarned: string;
  effectiveIncomeHour: string;
}

interface Purchase {
  id: string;
  user: { id: string; username: string };
  packageId: string;
  coins: number;
  amountPaid: number;
  createdAt: string;
}

export function EconomyPage() {
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [metric, setMetric] = useState('cash');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [playersRes, purchasesRes] = await Promise.all([
        api.getTopPlayers(metric, 20),
        api.getRecentPurchases(20),
      ]);

      if (playersRes.success) setTopPlayers(playersRes.data as TopPlayer[]);
      if (purchasesRes.success) setPurchases(purchasesRes.data as Purchase[]);
      setLoading(false);
    }
    fetchData();
  }, [metric]);

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Economy</h1>
        <p className="text-zinc-500">Top players and purchase history</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Players */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="font-bold text-zinc-100">Top Players</h2>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100"
            >
              <option value="cash">By Cash</option>
              <option value="level">By Level</option>
              <option value="lifetime">By Lifetime Earned</option>
              <option value="income">By Income/Hour</option>
            </select>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-auto">
            {topPlayers.map((player) => (
              <div key={player.user.id} className="p-3 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  player.rank === 1 ? 'bg-amber-500/20 text-amber-400' :
                  player.rank === 2 ? 'bg-zinc-400/20 text-zinc-300' :
                  player.rank === 3 ? 'bg-orange-600/20 text-orange-400' :
                  'bg-zinc-800 text-zinc-400'
                }`}>
                  {player.rank}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-100">{player.user.username}</span>
                    {player.user.isPremium && (
                      <span className="text-xs text-amber-400">★</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">Level {player.playerLevel}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-amber-400">{formatCurrency(player.cash)}</div>
                  <div className="text-xs text-zinc-500">{formatCurrency(player.effectiveIncomeHour)}/hr</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="font-bold text-zinc-100">Recent Purchases</h2>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-auto">
            {purchases.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No purchases yet</div>
            ) : (
              purchases.map((purchase) => (
                <div key={purchase.id} className="p-3 flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-400">
                    💰
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-zinc-100">{purchase.user.username}</div>
                    <div className="text-xs text-zinc-500">
                      {purchase.coins.toLocaleString()} coins
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-green-400">${purchase.amountPaid.toFixed(2)}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
