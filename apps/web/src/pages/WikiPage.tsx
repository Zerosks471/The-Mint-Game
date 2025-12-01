import { useState } from 'react';

type WikiSection =
  | 'getting-started'
  | 'properties'
  | 'businesses'
  | 'mini-games'
  | 'stocks'
  | 'prestige'
  | 'progression'
  | 'tips';

interface WikiNavItem {
  id: WikiSection;
  label: string;
  icon: string;
}

const wikiNavItems: WikiNavItem[] = [
  { id: 'getting-started', label: 'Getting Started', icon: '🎮' },
  { id: 'properties', label: 'Properties', icon: '🏢' },
  { id: 'businesses', label: 'Businesses', icon: '💼' },
  { id: 'mini-games', label: 'Mini-Games', icon: '🎯' },
  { id: 'stocks', label: 'Stocks & IPO', icon: '📈' },
  { id: 'prestige', label: 'Phases & Projects', icon: '🚀' },
  { id: 'progression', label: 'Progression & Tiers', icon: '⭐' },
  { id: 'tips', label: 'Pro Tips', icon: '💡' },
];

export function WikiPage() {
  const [activeSection, setActiveSection] = useState<WikiSection>('getting-started');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Game Wiki</h1>
        <p className="text-zinc-400">Everything you need to know about The Mint</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-4 sticky top-6">
            <nav className="space-y-1">
              {wikiNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                    activeSection === item.id
                      ? 'bg-mint/10 text-mint'
                      : 'text-zinc-400 hover:bg-dark-elevated hover:text-zinc-200'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            {activeSection === 'getting-started' && <GettingStartedSection />}
            {activeSection === 'properties' && <PropertiesSection />}
            {activeSection === 'businesses' && <BusinessesSection />}
            {activeSection === 'mini-games' && <MiniGamesSection />}
            {activeSection === 'stocks' && <StocksSection />}
            {activeSection === 'prestige' && <PrestigeSection />}
            {activeSection === 'progression' && <ProgressionSection />}
            {activeSection === 'tips' && <TipsSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h2 className="flex items-center gap-3 text-xl font-bold text-zinc-100 mb-4">
      <span className="text-2xl">{icon}</span>
      {title}
    </h2>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-mint mb-2">{title}</h3>
      <div className="text-zinc-300 space-y-2">{children}</div>
    </div>
  );
}

function InfoBox({ type, children }: { type: 'tip' | 'warning' | 'info'; children: React.ReactNode }) {
  const styles = {
    tip: 'bg-mint/10 border-mint/30 text-mint',
    warning: 'bg-amber/10 border-amber/30 text-amber',
    info: 'bg-cyan/10 border-cyan/30 text-cyan',
  };

  const icons = {
    tip: '💡',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div className={`${styles[type]} border rounded-xl p-4 my-4`}>
      <span className="mr-2">{icons[type]}</span>
      {children}
    </div>
  );
}

function GettingStartedSection() {
  return (
    <div>
      <SectionTitle icon="🎮" title="Getting Started" />

      <SubSection title="Welcome to The Mint!">
        <p>
          The Mint is an idle financial tycoon game where you build your investment empire
          through real estate, businesses, and strategic decision-making. Your goal is to
          accumulate wealth and climb the leaderboards!
        </p>
      </SubSection>

      <SubSection title="Your First Steps">
        <ol className="list-decimal list-inside space-y-2">
          <li><strong>Buy your first property</strong> - Start with a Hot Dog Stand ($100) to begin earning passive income</li>
          <li><strong>Collect earnings</strong> - Your properties generate income automatically every hour</li>
          <li><strong>Buy a business</strong> - Businesses have cycle timers and require mini-games to collect revenue</li>
          <li><strong>Level up</strong> - Gain XP from business revenue to unlock higher tier items</li>
          <li><strong>Reinvest profits</strong> - Use your earnings to buy more properties and businesses</li>
        </ol>
      </SubSection>

      <SubSection title="Understanding Your Dashboard">
        <ul className="list-disc list-inside space-y-2">
          <li><strong>Total Cash</strong> - Your current balance, updated in real-time</li>
          <li><strong>Per Hour</strong> - Your passive income rate from all properties</li>
          <li><strong>Properties</strong> - Number of properties you own and their total income</li>
          <li><strong>Businesses</strong> - Number of businesses and how many have revenue ready to collect</li>
        </ul>
      </SubSection>

      <InfoBox type="tip">
        Start by buying multiple cheap properties rather than one expensive one.
        This spreads your risk and generates income faster!
      </InfoBox>
    </div>
  );
}

function PropertiesSection() {
  return (
    <div>
      <SectionTitle icon="🏢" title="Properties" />

      <SubSection title="What Are Properties?">
        <p>
          Properties are your primary source of <strong>passive income</strong>. Once purchased,
          they generate money automatically every hour without any action required from you.
        </p>
      </SubSection>

      <SubSection title="Property Types by Tier">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 text-zinc-400">Tier</th>
                <th className="text-left py-2 text-zinc-400">Property</th>
                <th className="text-right py-2 text-zinc-400">Base Cost</th>
                <th className="text-right py-2 text-zinc-400">Income/hr</th>
                <th className="text-right py-2 text-zinc-400">Unlock Level</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <tr className="border-b border-dark-border/50">
                <td className="py-2">1</td>
                <td>Hot Dog Stand</td>
                <td className="text-right text-mint">$100</td>
                <td className="text-right">$5/hr</td>
                <td className="text-right">1</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">1</td>
                <td>Newspaper Route</td>
                <td className="text-right text-mint">$500</td>
                <td className="text-right">$25/hr</td>
                <td className="text-right">1</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">1</td>
                <td>Car Wash</td>
                <td className="text-right text-mint">$2,000</td>
                <td className="text-right">$100/hr</td>
                <td className="text-right">1</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">2</td>
                <td>Rental Property</td>
                <td className="text-right text-mint">$10,000</td>
                <td className="text-right">$500/hr</td>
                <td className="text-right">5</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">2</td>
                <td>Apartment Complex</td>
                <td className="text-right text-mint">$50,000</td>
                <td className="text-right">$2,500/hr</td>
                <td className="text-right">10</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">2</td>
                <td>Townhouse</td>
                <td className="text-right text-mint">$200,000</td>
                <td className="text-right">$10,000/hr</td>
                <td className="text-right">15</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">3</td>
                <td>Shopping Center</td>
                <td className="text-right text-mint">$1,000,000</td>
                <td className="text-right">$50,000/hr</td>
                <td className="text-right">20</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">3</td>
                <td>Office Building</td>
                <td className="text-right text-mint">$5,000,000</td>
                <td className="text-right">$250,000/hr</td>
                <td className="text-right">25</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">3</td>
                <td>Hotel</td>
                <td className="text-right text-mint">$20,000,000</td>
                <td className="text-right">$1,000,000/hr</td>
                <td className="text-right">30</td>
              </tr>
              <tr>
                <td className="py-2">4</td>
                <td>Skyscraper</td>
                <td className="text-right text-mint">$100,000,000</td>
                <td className="text-right">$5,000,000/hr</td>
                <td className="text-right">35</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SubSection>

      <SubSection title="Property Actions">
        <ul className="list-disc list-inside space-y-2">
          <li><strong>Buy</strong> - Purchase a new property. Cost increases with each one you own of the same type</li>
          <li><strong>Upgrade</strong> - Increase income by upgrading (up to level 100). Each upgrade costs 50% of base cost</li>
          <li><strong>Hire Manager</strong> - Managers allow properties to earn while you're offline</li>
          <li><strong>Sell</strong> - Sell properties for 50% of total investment (use to recover from mistakes)</li>
        </ul>
      </SubSection>

      <SubSection title="Cost Scaling">
        <p>Each time you buy a property of the same type, the cost increases:</p>
        <p className="font-mono bg-dark-elevated rounded-lg p-3 mt-2">
          Next Cost = Base Cost × (Cost Multiplier ^ Quantity Owned)
        </p>
      </SubSection>

      <InfoBox type="info">
        Properties with managers earn income even when you're offline!
        Free users can accumulate up to 8 hours, Premium users get 24 hours.
      </InfoBox>
    </div>
  );
}

function BusinessesSection() {
  return (
    <div>
      <SectionTitle icon="💼" title="Businesses" />

      <SubSection title="What Are Businesses?">
        <p>
          Businesses are <strong>active income sources</strong> that require you to complete
          mini-games to collect revenue. Unlike properties, businesses have cycle timers
          and offer larger payouts per collection.
        </p>
      </SubSection>

      <SubSection title="How Businesses Work">
        <ol className="list-decimal list-inside space-y-2">
          <li><strong>Cycle Timer</strong> - Each business has a cycle time (30-60 seconds)</li>
          <li><strong>Wait for Ready</strong> - When the cycle completes, the "Collect" button appears</li>
          <li><strong>Play Mini-Game</strong> - Complete the mini-game to collect your revenue</li>
          <li><strong>Earn XP</strong> - You gain experience points equal to revenue ÷ 100</li>
          <li><strong>Repeat</strong> - A new cycle starts automatically after collection</li>
        </ol>
      </SubSection>

      <SubSection title="Business Types">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 text-zinc-400">Business</th>
                <th className="text-right py-2 text-zinc-400">Base Cost</th>
                <th className="text-right py-2 text-zinc-400">Revenue</th>
                <th className="text-right py-2 text-zinc-400">Cycle Time</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <tr className="border-b border-dark-border/50">
                <td className="py-2">Restaurant</td>
                <td className="text-right text-mint">$5,000</td>
                <td className="text-right">$500</td>
                <td className="text-right">30s</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">Tech Startup</td>
                <td className="text-right text-mint">$25,000</td>
                <td className="text-right">$2,500</td>
                <td className="text-right">45s</td>
              </tr>
              <tr>
                <td className="py-2">Retail Store</td>
                <td className="text-right text-mint">$10,000</td>
                <td className="text-right">$1,000</td>
                <td className="text-right">60s</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SubSection>

      <SubSection title="Leveling Up Businesses">
        <p>
          You can level up businesses to increase their revenue per cycle. Each level
          multiplies the base revenue by the level revenue multiplier.
        </p>
        <p className="font-mono bg-dark-elevated rounded-lg p-3 mt-2">
          Revenue = Base Revenue × (Level Multiplier ^ (Level - 1))
        </p>
      </SubSection>

      <InfoBox type="warning">
        You can only own one of each business type. Focus on leveling them up
        rather than trying to buy duplicates!
      </InfoBox>
    </div>
  );
}

function MiniGamesSection() {
  return (
    <div>
      <SectionTitle icon="🎯" title="Mini-Games" />

      <SubSection title="What Are Mini-Games?">
        <p>
          Mini-games are quick tasks you complete to collect business revenue.
          They scale in difficulty based on your business level and provide
          an engaging way to earn money.
        </p>
      </SubSection>

      <SubSection title="Order Rush (Restaurant)">
        <p>
          In Order Rush, you need to arrange food items in the correct order
          within the time limit. The game tests your speed and pattern recognition.
        </p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li><strong>Items</strong> - Number of items increases with business level</li>
          <li><strong>Time Limit</strong> - You have limited seconds to complete the task</li>
          <li><strong>Scoring</strong> - Match all items correctly to succeed</li>
        </ul>
      </SubSection>

      <SubSection title="Attempt System">
        <p>You get <strong>3 attempts</strong> per cycle to complete the mini-game:</p>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 text-zinc-400">Attempt</th>
                <th className="text-right py-2 text-zinc-400">Revenue Multiplier</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <tr className="border-b border-dark-border/50">
                <td className="py-2">1st Attempt</td>
                <td className="text-right text-mint">100%</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">2nd Attempt</td>
                <td className="text-right text-amber">75%</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">3rd Attempt</td>
                <td className="text-right text-pink">50%</td>
              </tr>
              <tr>
                <td className="py-2">All Failed</td>
                <td className="text-right text-red-400">0% (Free) / 50% (Premium)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SubSection>

      <InfoBox type="tip">
        Take your time on the first attempt! It's better to succeed at 100%
        than rush and fail, dropping to 75% or 50%.
      </InfoBox>
    </div>
  );
}

function StocksSection() {
  return (
    <div>
      <SectionTitle icon="📈" title="Stocks & IPO" />

      <SubSection title="Stock Market">
        <p>
          The stock market allows you to invest in virtual companies. Stock prices
          fluctuate based on simulated market conditions, giving you opportunities
          to buy low and sell high.
        </p>
      </SubSection>

      <SubSection title="How Stocks Work">
        <ul className="list-disc list-inside space-y-2">
          <li><strong>Buy Shares</strong> - Purchase shares at the current market price</li>
          <li><strong>Price Changes</strong> - Prices update regularly based on market simulation</li>
          <li><strong>Sell Shares</strong> - Sell your holdings when you want to realize gains</li>
          <li><strong>Portfolio</strong> - Track your investments and overall performance</li>
        </ul>
      </SubSection>

      <SubSection title="Your Company IPO">
        <p>
          As your empire grows, your company becomes eligible for an IPO (Initial Public Offering).
          This allows you to sell shares of your own company for cash.
        </p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li><strong>Net Worth Based</strong> - Your IPO share price is based on your total net worth</li>
          <li><strong>100 Shares</strong> - You can sell up to 100 shares of your company</li>
          <li><strong>Cash Out</strong> - Selling shares converts your net worth into liquid cash</li>
          <li><strong>No Reset</strong> - Unlike traditional prestige systems, selling IPO shares does NOT reset your progress</li>
        </ul>
      </SubSection>

      <InfoBox type="info">
        Your IPO is a way to cash out on your empire's value without losing your properties,
        businesses, or upgrades. Sell when your share price is high!
      </InfoBox>

      <InfoBox type="warning">
        Stock prices can go down as well as up! Don't invest more than you can
        afford to lose, and diversify your portfolio.
      </InfoBox>
    </div>
  );
}

function PrestigeSection() {
  return (
    <div>
      <SectionTitle icon="🚀" title="Phases & Projects" />

      <SubSection title="No-Reset Progression">
        <p>
          Unlike traditional idle games, <strong>The Mint has no resets!</strong> Your empire
          grows continuously. Instead of prestige resets, you progress through <strong>Phases</strong> by
          building your net worth, and unlock permanent bonuses through <strong>Projects</strong> and <strong>Upgrades</strong>.
        </p>
      </SubSection>

      <SubSection title="The Five Phases">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 text-zinc-400">Phase</th>
                <th className="text-left py-2 text-zinc-400">Name</th>
                <th className="text-right py-2 text-zinc-400">Net Worth Required</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <tr className="border-b border-dark-border/50">
                <td className="py-2">1</td>
                <td>Hustler</td>
                <td className="text-right text-mint">$0</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">2</td>
                <td>Landlord</td>
                <td className="text-right text-mint">$100,000</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">3</td>
                <td>Mogul</td>
                <td className="text-right text-mint">$10,000,000</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">4</td>
                <td>Investor</td>
                <td className="text-right text-mint">$1,000,000,000</td>
              </tr>
              <tr>
                <td className="py-2">5</td>
                <td>Titan</td>
                <td className="text-right text-mint">$100,000,000,000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SubSection>

      <SubSection title="Projects">
        <p>
          Projects are <strong>one-time purchases</strong> that provide permanent bonuses.
          Each phase unlocks new projects to purchase.
        </p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li><strong>Marketing</strong> - Increase income multipliers</li>
          <li><strong>Operations</strong> - Improve business efficiency</li>
          <li><strong>Technology</strong> - Automate and optimize</li>
          <li><strong>Expansion</strong> - Unlock new opportunities</li>
        </ul>
      </SubSection>

      <SubSection title="Upgrades">
        <p>
          Upgrades are <strong>repeatable purchases</strong> that can be leveled up multiple times.
          Each level provides incremental bonuses but costs more than the previous level.
        </p>
      </SubSection>

      <InfoBox type="tip">
        Focus on building your net worth to unlock new phases. Each phase brings
        powerful new projects and upgrades that accelerate your growth!
      </InfoBox>
    </div>
  );
}

function ProgressionSection() {
  return (
    <div>
      <SectionTitle icon="⭐" title="Progression & Tiers" />

      <SubSection title="Player Level">
        <p>
          Your player level determines what properties and businesses you can access.
          You gain XP primarily from collecting business revenue.
        </p>
        <p className="font-mono bg-dark-elevated rounded-lg p-3 mt-2">
          XP Gained = Business Revenue ÷ 100
        </p>
      </SubSection>

      <SubSection title="Leveling Formula">
        <p>The XP required for each level follows this formula:</p>
        <p className="font-mono bg-dark-elevated rounded-lg p-3 mt-2">
          XP Needed = 100 × (1.5 ^ (Level - 1))
        </p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 text-zinc-400">Level</th>
                <th className="text-right py-2 text-zinc-400">XP Required</th>
                <th className="text-right py-2 text-zinc-400">Total XP</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <tr className="border-b border-dark-border/50">
                <td className="py-2">1 → 2</td>
                <td className="text-right">100</td>
                <td className="text-right">100</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">2 → 3</td>
                <td className="text-right">150</td>
                <td className="text-right">250</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">3 → 4</td>
                <td className="text-right">225</td>
                <td className="text-right">475</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2">4 → 5</td>
                <td className="text-right">338</td>
                <td className="text-right">813</td>
              </tr>
              <tr>
                <td className="py-2">5 → 6</td>
                <td className="text-right">506</td>
                <td className="text-right">1,319</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SubSection>

      <SubSection title="Tier Unlock Requirements">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 text-zinc-400">Tier</th>
                <th className="text-left py-2 text-zinc-400">Level Required</th>
                <th className="text-left py-2 text-zinc-400">What You Unlock</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <tr className="border-b border-dark-border/50">
                <td className="py-2 text-mint font-bold">Tier 1</td>
                <td>Level 1</td>
                <td>Hot Dog Stand, Newspaper Route, Car Wash</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2 text-cyan font-bold">Tier 2</td>
                <td>Level 5-15</td>
                <td>Rental Property (5), Apartment (10), Townhouse (15)</td>
              </tr>
              <tr className="border-b border-dark-border/50">
                <td className="py-2 text-purple font-bold">Tier 3</td>
                <td>Level 20-30</td>
                <td>Shopping Center (20), Office Building (25), Hotel (30)</td>
              </tr>
              <tr>
                <td className="py-2 text-pink font-bold">Tier 4</td>
                <td>Level 35+</td>
                <td>Skyscraper</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SubSection>

      <InfoBox type="tip">
        Focus on businesses early! They're the primary source of XP and will
        help you unlock higher tiers faster than just buying properties.
      </InfoBox>
    </div>
  );
}

function TipsSection() {
  return (
    <div>
      <SectionTitle icon="💡" title="Pro Tips" />

      <SubSection title="Early Game Strategy (Hustler Phase)">
        <ul className="list-disc list-inside space-y-2">
          <li>Buy multiple Hot Dog Stands first - they're cheap and stack up quickly</li>
          <li>Get a Restaurant business ASAP for XP generation</li>
          <li>Always hire managers on properties for offline earnings</li>
          <li>Check back every few hours to collect offline earnings</li>
          <li>Focus on reaching $100K net worth to unlock Landlord phase</li>
        </ul>
      </SubSection>

      <SubSection title="Mid Game Strategy (Landlord/Mogul Phases)">
        <ul className="list-disc list-inside space-y-2">
          <li>Focus on leveling up businesses rather than buying new ones</li>
          <li>Balance property purchases with business investments</li>
          <li>Start purchasing Projects to boost your income multipliers</li>
          <li>Invest in Upgrades for compounding bonus effects</li>
          <li>Consider selling IPO shares if you need quick cash</li>
        </ul>
      </SubSection>

      <SubSection title="Late Game Strategy (Investor/Titan Phases)">
        <ul className="list-disc list-inside space-y-2">
          <li>Complete all available Projects in each phase</li>
          <li>Max out Upgrades for massive multiplier bonuses</li>
          <li>Use the stock market strategically for additional income</li>
          <li>Compete on leaderboards for bragging rights</li>
        </ul>
      </SubSection>

      <SubSection title="Common Mistakes to Avoid">
        <ul className="list-disc list-inside space-y-2">
          <li className="text-red-400">Spending all cash on one expensive property early</li>
          <li className="text-red-400">Ignoring businesses (they give XP!)</li>
          <li className="text-red-400">Forgetting to hire managers for offline income</li>
          <li className="text-red-400">Skipping Projects that boost income multipliers</li>
          <li className="text-red-400">Rushing mini-games and failing repeatedly</li>
        </ul>
      </SubSection>

      <SubSection title="Premium Benefits">
        <ul className="list-disc list-inside space-y-2">
          <li className="text-mint">+10% income bonus on all earnings</li>
          <li className="text-mint">24-hour offline cap (vs 8 hours for free)</li>
          <li className="text-mint">50% safety net if all mini-game attempts fail</li>
          <li className="text-mint">Exclusive cosmetics and profile frames</li>
        </ul>
      </SubSection>

      <InfoBox type="info">
        The key to success in The Mint is patience and compound growth.
        Small gains add up over time, especially with Project and Upgrade bonuses!
      </InfoBox>
    </div>
  );
}
