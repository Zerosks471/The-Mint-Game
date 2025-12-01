import { useEffect, useState } from 'react';
import { formatCurrency } from '@mint/utils';
import { useGameStore } from '../stores/gameStore';
import { gameApi } from '../api/game';

interface PhaseInfo {
  id: number;
  slug: string;
  name: string;
  description: string;
  netWorthRequired: number;
  isUnlocked: boolean;
  isCurrent: boolean;
  progress: number;
}

interface ProjectInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  cost: string;
  phaseRequired: number;
  effect: Record<string, unknown>;
  isCompleted: boolean;
  canAfford: boolean;
  canPurchase: boolean;
  prerequisiteMet: boolean;
  prerequisiteSlug: string | null;
}

interface UpgradeInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  currentLevel: number;
  maxLevel: number;
  currentCost: string;
  effect: Record<string, unknown>;
  effectPerLevel: number;
  totalEffect: number;
  phaseRequired: number;
  canAfford: boolean;
  canPurchase: boolean;
  isMaxed: boolean;
}

interface ProgressionData {
  phase: {
    currentPhase: PhaseInfo;
    allPhases: PhaseInfo[];
    netWorth: string;
  };
  projects: {
    available: ProjectInfo[];
    completed: ProjectInfo[];
    locked: ProjectInfo[];
  };
  upgrades: UpgradeInfo[];
}

const categoryIcons: Record<string, string> = {
  marketing: '📢',
  operations: '⚙️',
  technology: '💻',
  expansion: '🏢',
  income: '💰',
  automation: '🤖',
  efficiency: '📈',
};

const phaseIcons: Record<string, string> = {
  hustler: '💼',
  landlord: '🏠',
  mogul: '🏦',
  investor: '📊',
  titan: '👑',
};

export function UpgradesPage() {
  const [data, setData] = useState<ProgressionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'upgrades'>('projects');
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const refreshStats = useGameStore((s) => s.refreshStats);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await gameApi.getProgressionStatus();
      if (res.success && res.data) {
        // Transform the data to match expected structure
        setData(res.data as unknown as ProgressionData);
      } else {
        setError(res.error?.message || 'Failed to load data');
      }
    } catch {
      setError('Failed to load progression data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePurchaseProject = async (projectId: string) => {
    try {
      const res = await gameApi.buyProject(projectId);
      if (res.success) {
        setPurchaseMessage('Project completed!');
        await fetchData();
        refreshStats();
        setTimeout(() => setPurchaseMessage(null), 3000);
      } else {
        setError(res.error?.message || 'Failed to purchase');
      }
    } catch {
      setError('Failed to purchase project');
    }
  };

  const handlePurchaseUpgrade = async (upgradeId: string) => {
    try {
      const res = await gameApi.buyUpgrade(upgradeId);
      if (res.success) {
        setPurchaseMessage('Upgrade purchased!');
        await fetchData();
        refreshStats();
        setTimeout(() => setPurchaseMessage(null), 3000);
      } else {
        setError(res.error?.message || 'Failed to purchase');
      }
    } catch {
      setError('Failed to purchase upgrade');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-zinc-500 py-12">
        Failed to load progression data
      </div>
    );
  }

  const { phase, projects, upgrades } = data;
  const currentPhase = phase.currentPhase;
  const netWorth = parseFloat(phase.netWorth);

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {purchaseMessage && (
        <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 text-green-400 animate-pulse">
          {purchaseMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Phase Status Card */}
      <div className="bg-gradient-to-br from-mint to-cyan-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm opacity-75">Current Phase</p>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span>{phaseIcons[currentPhase.slug] || '🎯'}</span>
              {currentPhase.name}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-75">Net Worth</p>
            <p className="text-2xl font-bold">{formatCurrency(netWorth)}</p>
          </div>
        </div>

        <p className="text-white/80 mb-4">{currentPhase.description}</p>

        {/* Phase Progress */}
        <div className="flex gap-2">
          {phase.allPhases.map((p) => (
            <div
              key={p.id}
              className={`flex-1 rounded-lg p-2 text-center text-xs ${
                p.isCurrent
                  ? 'bg-white/30 ring-2 ring-white'
                  : p.isUnlocked
                    ? 'bg-white/20'
                    : 'bg-black/20 opacity-50'
              }`}
            >
              <div className="text-lg mb-1">{phaseIcons[p.slug] || '🎯'}</div>
              <div className="font-medium">{p.name}</div>
              {!p.isUnlocked && (
                <div className="text-[10px] opacity-75">
                  {formatCurrency(p.netWorthRequired)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress to next phase */}
        {currentPhase.id < 5 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span>Progress to next phase</span>
              <span>{currentPhase.progress.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all"
                style={{ width: `${currentPhase.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'projects'
              ? 'bg-mint text-white'
              : 'bg-dark-elevated text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Projects ({projects.available.length + projects.completed.length})
        </button>
        <button
          onClick={() => setActiveTab('upgrades')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'upgrades'
              ? 'bg-mint text-white'
              : 'bg-dark-elevated text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Upgrades ({upgrades.length})
        </button>
      </div>

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          {/* Available Projects */}
          {projects.available.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-zinc-100 mb-3">Available Projects</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.available.map((project) => (
                  <div
                    key={project.id}
                    className="bg-dark-card border border-dark-border rounded-xl p-4 hover:border-mint/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {categoryIcons[project.category] || '🎯'}
                        </span>
                        <div>
                          <h3 className="font-bold text-zinc-100">{project.name}</h3>
                          <p className="text-xs text-zinc-500 capitalize">
                            {project.category}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 mb-3">{project.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-mint">
                        {formatCurrency(parseFloat(project.cost))}
                      </span>
                      <button
                        onClick={() => handlePurchaseProject(project.slug)}
                        disabled={!project.canPurchase}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          project.canPurchase
                            ? 'bg-mint hover:bg-mint/80 text-white'
                            : 'bg-dark-elevated text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        {project.canAfford ? 'Purchase' : 'Not Enough Cash'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Projects */}
          {projects.completed.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-zinc-100 mb-3">
                Completed Projects ({projects.completed.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.completed.map((project) => (
                  <div
                    key={project.id}
                    className="bg-dark-elevated border border-mint/30 rounded-xl p-4 opacity-75"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">
                        {categoryIcons[project.category] || '🎯'}
                      </span>
                      <div>
                        <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                          {project.name}
                          <span className="text-green-400 text-sm">✓</span>
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-500">{project.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked Projects */}
          {projects.locked.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-zinc-100 mb-3">
                Locked Projects ({projects.locked.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.locked.map((project) => (
                  <div
                    key={project.id}
                    className="bg-dark-elevated border border-dark-border rounded-xl p-4 opacity-50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl grayscale">
                        {categoryIcons[project.category] || '🎯'}
                      </span>
                      <div>
                        <h3 className="font-bold text-zinc-400">{project.name}</h3>
                        <p className="text-xs text-zinc-600">
                          Requires Phase {project.phaseRequired}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-600">{project.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.available.length === 0 &&
            projects.completed.length === 0 &&
            projects.locked.length === 0 && (
              <p className="text-center text-zinc-500 py-8">No projects available yet.</p>
            )}
        </div>
      )}

      {/* Upgrades Tab */}
      {activeTab === 'upgrades' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-100">Repeatable Upgrades</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {upgrades.map((upgrade) => (
              <div
                key={upgrade.id}
                className={`bg-dark-card border rounded-xl p-4 ${
                  upgrade.isMaxed ? 'border-mint/50' : 'border-dark-border'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {categoryIcons[upgrade.category] || '🎯'}
                    </span>
                    <div>
                      <h3 className="font-bold text-zinc-100">{upgrade.name}</h3>
                      <p className="text-xs text-zinc-500 capitalize">{upgrade.category}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      upgrade.isMaxed
                        ? 'bg-mint/20 text-mint'
                        : 'bg-dark-elevated text-zinc-400'
                    }`}
                  >
                    Lv.{upgrade.currentLevel}/{upgrade.maxLevel}
                  </span>
                </div>

                <p className="text-sm text-zinc-400 mb-3">{upgrade.description}</p>

                {/* Effect display */}
                <div className="text-xs text-zinc-500 mb-3">
                  Current bonus: <span className="text-mint">+{(upgrade.totalEffect * 100).toFixed(0)}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-dark-elevated rounded-full mb-3 overflow-hidden">
                  <div
                    className="h-full bg-mint rounded-full transition-all"
                    style={{ width: `${(upgrade.currentLevel / upgrade.maxLevel) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  {upgrade.isMaxed ? (
                    <span className="text-sm text-mint font-medium">Max Level</span>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-zinc-300">
                        {formatCurrency(parseFloat(upgrade.currentCost))}
                      </span>
                      <button
                        onClick={() => handlePurchaseUpgrade(upgrade.slug)}
                        disabled={!upgrade.canPurchase}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          upgrade.canPurchase
                            ? 'bg-mint hover:bg-mint/80 text-white'
                            : 'bg-dark-elevated text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        {upgrade.canAfford ? 'Upgrade' : 'Not Enough Cash'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {upgrades.length === 0 && (
            <p className="text-center text-zinc-500 py-8">No upgrades available yet.</p>
          )}
        </div>
      )}

    </div>
  );
}
