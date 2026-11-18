import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { getInitials } from '../../utils/formatters';
import { BrandLogo } from '../shared/BrandLogo';
import { Badge } from '../ui/Badge';
import { WORKSPACE_NAV_ITEMS } from './navigation';

const PRIMARY_IDS = new Set(['overview', 'competitions', 'tasks', 'calendar']);

export function Sidebar() {
  const { profile, role, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const isOwner = role === 'owner';

  const workspaceItems = WORKSPACE_NAV_ITEMS.filter((item) =>
    PRIMARY_IDS.has(item.id)
  );
  const systemItems = WORKSPACE_NAV_ITEMS.filter(
    (item) => !PRIMARY_IDS.has(item.id)
  );

  const renderLink = (item: (typeof WORKSPACE_NAV_ITEMS)[number]) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.id}
        to={item.to}
        className={({ isActive }) =>
          `group relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 select-none ${
            isActive
              ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs dark:bg-blue-950/60 dark:text-blue-300'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span
                className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-blue-600 dark:bg-blue-400"
                aria-hidden="true"
              />
            )}
            <Icon
              className={`h-4 w-4 shrink-0 transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
              }`}
              aria-hidden="true"
            />
            <span className="truncate flex-1">{item.label}</span>
            {item.id === 'notifications' && unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-rose-600 px-1.5 py-0.2 font-mono text-[10px] font-bold text-white shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <aside
      aria-label="Navigasi utama workspace"
      className="hidden w-64 shrink-0 flex-col border-r border-slate-200/90 bg-slate-50/70 backdrop-blur-xs lg:flex dark:border-slate-800/90 dark:bg-slate-950/80"
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b border-slate-200/90 px-5 dark:border-slate-800/90">
        <BrandLogo size="sm" showWordmark showSubtitle />
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Workspace
          </div>
          {workspaceItems.map(renderLink)}
        </div>

        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Tim & Sistem
          </div>
          {systemItems.map(renderLink)}
        </div>
      </nav>

      {/* User Session Footer */}
      <div className="border-t border-slate-200/90 p-3 dark:border-slate-800/90">
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/60 bg-white p-2 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/60">
          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-display text-xs font-bold text-white shadow-2xs"
          >
            {getInitials(profile?.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              {profile?.full_name ?? 'Pengguna TEMAN'}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
              <Badge
                variant={isOwner ? 'primary' : 'default'}
                size="sm"
                className="scale-90 origin-left"
              >
                {isOwner ? 'Owner' : 'Member'}
              </Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Keluar dari akun"
            title="Keluar dari akun"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-slate-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
