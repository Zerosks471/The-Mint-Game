import { useState } from 'react';

type WikiSection = 'overview' | 'properties' | 'businesses' | 'stocks' | 'tips';

const sections = [
  { id: 'overview' as const, label: 'Overview', icon: '🎮' },
  { id: 'properties' as const, label: 'Properties', icon: '🏢' },
  { id: 'businesses' as const, label: 'Businesses', icon: '💼' },
  { id: 'stocks' as const, label: 'Stocks', icon: '📈' },
  { id: 'tips' as const, label: 'Tips', icon: '💡' },
];

export function WikiPage() {
  const [active, setActive] = useState<WikiSection>('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
          <span className="text-3xl">📚</span>
          Game Guide
        </h1>
        <p className="text-zinc-400 mt-1">Quick overview of The Mint</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
              ${active === s.id
                ? 'bg-mint text-dark-base'
                : 'bg-dark-card border border-dark-border text-zinc-400 hover:text-zinc-200'
              }
            `}
          >
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        {active === 'overview' && <OverviewSection />}
        {active === 'properties' && <PropertiesSection />}
        {active === 'businesses' && <BusinessesSection />}
        {active === 'stocks' && <StocksSection />}
        {active === 'tips' && <TipsSection />}
      </div>
    </div>
  );
}

function OverviewSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-zinc-100">Welcome to The Mint</h2>

      <p className="text-zinc-300">
        Build your financial empire by buying properties, running businesses, and investing in stocks.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-dark-elevated rounded-xl p-4">
          <h3 className="font-semibold text-mint mb-2">🏢 Properties</h3>
          <p className="text-sm text-zinc-400">Buy properties for passive income every hour</p>
        </div>
        <div className="bg-dark-elevated rounded-xl p-4">
          <h3 className="font-semibold text-mint mb-2">💼 Businesses</h3>
          <p className="text-sm text-zinc-400">Run businesses and complete mini-games for cash + XP</p>
        </div>
        <div className="bg-dark-elevated rounded-xl p-4">
          <h3 className="font-semibold text-mint mb-2">📈 Stocks</h3>
          <p className="text-sm text-zinc-400">Trade stocks and launch your own company IPO</p>
        </div>
        <div className="bg-dark-elevated rounded-xl p-4">
          <h3 className="font-semibold text-mint mb-2">🌙 Offline Earnings</h3>
          <p className="text-sm text-zinc-400">Hire managers to earn money while you're away</p>
        </div>
      </div>

      <div className="bg-mint/10 border border-mint/30 rounded-xl p-4">
        <p className="text-mint text-sm">
          <strong>No resets!</strong> Your empire grows continuously - no prestige mechanics.
        </p>
      </div>
    </div>
  );
}

function PropertiesSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-zinc-100">Properties</h2>

      <p className="text-zinc-300">
        Properties generate <strong className="text-mint">passive income</strong> every hour automatically.
      </p>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-dark-elevated rounded-lg">
          <span className="text-zinc-300">🌭 Hot Dog Stand</span>
          <span className="text-mint font-mono">$100 → $5/hr</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-dark-elevated rounded-lg">
          <span className="text-zinc-300">🏠 Rental Property</span>
          <span className="text-mint font-mono">$10K → $500/hr</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-dark-elevated rounded-lg">
          <span className="text-zinc-300">🏢 Office Building</span>
          <span className="text-mint font-mono">$5M → $250K/hr</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-dark-elevated rounded-lg">
          <span className="text-zinc-300">🏙️ Skyscraper</span>
          <span className="text-mint font-mono">$100M → $5M/hr</span>
        </div>
      </div>

      <div className="text-sm text-zinc-400 space-y-1">
        <p>• <strong>Upgrade</strong> properties to increase income</p>
        <p>• <strong>Hire managers</strong> to earn while offline</p>
        <p>• Higher level = better properties unlocked</p>
      </div>
    </div>
  );
}

function BusinessesSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-zinc-100">Businesses</h2>

      <p className="text-zinc-300">
        Businesses have a cycle timer. When ready, complete a <strong className="text-mint">quick mini-game</strong> to collect cash and XP.
      </p>

      <div className="bg-dark-elevated rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-zinc-100">How it works:</h3>
        <ol className="text-sm text-zinc-400 space-y-2">
          <li>1. Wait for the cycle timer (30-60 seconds)</li>
          <li>2. Click "Collect" when ready</li>
          <li>3. Complete the mini-game (3-5 quick tasks)</li>
          <li>4. Get paid + earn XP</li>
        </ol>
      </div>

      <div className="bg-amber/10 border border-amber/30 rounded-xl p-4">
        <p className="text-amber text-sm">
          <strong>Mini-games are quick!</strong> Max 5 orders, 20-30 seconds total. Easy to complete.
        </p>
      </div>

      <div className="text-sm text-zinc-400 space-y-1">
        <p>• You get <strong>3 attempts</strong> per cycle</p>
        <p>• 1st attempt = 100%, 2nd = 75%, 3rd = 50%</p>
        <p>• Level up businesses for more revenue</p>
      </div>
    </div>
  );
}

function StocksSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-zinc-100">Stocks & IPO</h2>

      <p className="text-zinc-300">
        Trade stocks on the market and launch your own company.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-dark-elevated rounded-xl p-4">
          <h3 className="font-semibold text-cyan mb-2">Trading</h3>
          <p className="text-sm text-zinc-400">Buy low, sell high. Prices change regularly.</p>
        </div>
        <div className="bg-dark-elevated rounded-xl p-4">
          <h3 className="font-semibold text-purple mb-2">Your IPO</h3>
          <p className="text-sm text-zinc-400">List your company and sell shares for cash.</p>
        </div>
      </div>

      <div className="bg-cyan/10 border border-cyan/30 rounded-xl p-4">
        <p className="text-cyan text-sm">
          <strong>IPO doesn't reset anything!</strong> Just converts your net worth into cash.
        </p>
      </div>
    </div>
  );
}

function TipsSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-zinc-100">Quick Tips</h2>

      <div className="space-y-3">
        <div className="flex gap-3 p-3 bg-dark-elevated rounded-lg">
          <span className="text-xl">💰</span>
          <p className="text-sm text-zinc-300">Buy multiple cheap properties first - they add up fast</p>
        </div>
        <div className="flex gap-3 p-3 bg-dark-elevated rounded-lg">
          <span className="text-xl">⭐</span>
          <p className="text-sm text-zinc-300">Focus on businesses early for XP to level up</p>
        </div>
        <div className="flex gap-3 p-3 bg-dark-elevated rounded-lg">
          <span className="text-xl">🌙</span>
          <p className="text-sm text-zinc-300">Always hire managers for offline earnings</p>
        </div>
        <div className="flex gap-3 p-3 bg-dark-elevated rounded-lg">
          <span className="text-xl">📈</span>
          <p className="text-sm text-zinc-300">Level up businesses instead of buying duplicates</p>
        </div>
        <div className="flex gap-3 p-3 bg-dark-elevated rounded-lg">
          <span className="text-xl">🎯</span>
          <p className="text-sm text-zinc-300">Take your time on mini-games - accuracy over speed</p>
        </div>
      </div>

      <div className="bg-mint/10 border border-mint/30 rounded-xl p-4">
        <h3 className="font-semibold text-mint mb-2">Premium Benefits</h3>
        <ul className="text-sm text-zinc-300 space-y-1">
          <li>• +10% income bonus</li>
          <li>• 24-hour offline cap (vs 8 hours)</li>
          <li>• 50% safety net if mini-game fails</li>
        </ul>
      </div>
    </div>
  );
}
