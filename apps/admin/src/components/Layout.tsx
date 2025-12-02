import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/users', label: 'Users', icon: '👥' },
  { path: '/economy', label: 'Economy', icon: '💰' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
  { path: '/stocks', label: 'Stocks', icon: '📉' },
  { path: '/gameconfig', label: 'Game Config', icon: '⚙️' },
  { path: '/cosmetics', label: 'Cosmetics', icon: '🎨' },
  { path: '/coupons', label: 'Coupons', icon: '🎟️' },
  { path: '/system', label: 'System', icon: '🖥️' },
  { path: '/security', label: 'Security', icon: '🛡️' },
  { path: '/logs', label: 'Logs', icon: '📋' },
  { path: '/health', label: 'Health', icon: '💚' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h1 className="text-xl font-bold text-purple-400 flex items-center gap-2">
            <span>🔐</span>
            <span>Admin Dashboard</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">The Mint Game</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">{user?.username}</p>
              <p className="text-xs text-zinc-500">Admin</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
