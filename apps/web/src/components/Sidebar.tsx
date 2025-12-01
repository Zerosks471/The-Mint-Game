import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  color: 'mint' | 'cyan' | 'blue' | 'purple' | 'pink' | 'amber';
}

const mainNavItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠', color: 'mint' },
  { path: '/properties', label: 'Properties', icon: '🏢', color: 'blue' },
  { path: '/businesses', label: 'Businesses', icon: '💼', color: 'purple' },
  { path: '/stocks', label: 'Stocks', icon: '📈', color: 'cyan' },
  { path: '/prestige', label: 'Go Public', icon: '🚀', color: 'pink' },
];

const secondaryNavItems: NavItem[] = [
  { path: '/stats', label: 'Stats', icon: '📊', color: 'cyan' },
  { path: '/leaderboards', label: 'Rankings', icon: '🏆', color: 'amber' },
  { path: '/achievements', label: 'Achievements', icon: '🎖️', color: 'purple' },
  { path: '/shop', label: 'Shop', icon: '🛍️', color: 'pink' },
];

const colorClasses = {
  mint: {
    active: 'border-l-mint bg-mint/10 text-mint',
    hover: 'hover:bg-mint/5 hover:text-mint',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
  },
  cyan: {
    active: 'border-l-cyan bg-cyan/10 text-cyan',
    hover: 'hover:bg-cyan/5 hover:text-cyan',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]',
  },
  blue: {
    active: 'border-l-blue bg-blue/10 text-blue',
    hover: 'hover:bg-blue/5 hover:text-blue',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
  },
  purple: {
    active: 'border-l-purple bg-purple/10 text-purple',
    hover: 'hover:bg-purple/5 hover:text-purple',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
  },
  pink: {
    active: 'border-l-pink bg-pink/10 text-pink',
    hover: 'hover:bg-pink/5 hover:text-pink',
    glow: 'shadow-[0_0_20px_rgba(236,72,153,0.3)]',
  },
  amber: {
    active: 'border-l-amber bg-amber/10 text-amber',
    hover: 'hover:bg-amber/5 hover:text-amber',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
  },
};

interface SidebarProps {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path;
    const colors = colorClasses[item.color];

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`
          flex items-center gap-3 px-4 py-3 border-l-[3px] transition-all duration-200
          ${isActive
            ? `${colors.active} ${colors.glow} border-l-[3px]`
            : `border-l-transparent text-zinc-400 ${colors.hover}`
          }
          ${collapsed ? 'justify-center px-2' : ''}
        `}
        title={collapsed ? item.label : undefined}
      >
        <span className="text-xl">{item.icon}</span>
        {!collapsed && <span className="font-medium">{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen flex flex-col
        bg-dark-card border-r border-dark-border
        transition-all duration-300 z-40
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-dark-border">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl font-display font-bold text-mint drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
              The Mint
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-dark-elevated transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems.map(renderNavItem)}
        </div>

        {/* Divider */}
        <div className="my-4 mx-4 border-t border-dark-border" />

        <div className="space-y-1">
          {secondaryNavItems.map(renderNavItem)}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-dark-border py-4 space-y-1">
        <Link
          to="/settings"
          className={`
            flex items-center gap-3 px-4 py-3 border-l-[3px] transition-all duration-200
            ${location.pathname === '/settings'
              ? 'border-l-zinc-500 bg-zinc-500/10 text-zinc-300'
              : 'border-l-transparent text-zinc-400 hover:bg-zinc-500/5 hover:text-zinc-300'
            }
            ${collapsed ? 'justify-center px-2' : ''}
          `}
          title={collapsed ? 'Settings' : undefined}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {!collapsed && <span className="font-medium">Settings</span>}
        </Link>

        <button
          onClick={onLogout}
          className={`
            w-full flex items-center gap-3 px-4 py-3 border-l-[3px] border-l-transparent
            text-zinc-400 hover:bg-red-500/5 hover:text-red-400 transition-all duration-200
            ${collapsed ? 'justify-center px-2' : ''}
          `}
          title={collapsed ? 'Logout' : undefined}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
