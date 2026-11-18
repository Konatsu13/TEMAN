import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, MoreHorizontal, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { WORKSPACE_NAV_ITEMS } from './navigation';

export function MobileBottomNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { unreadCount } = useNotifications();

  const primaryItems = WORKSPACE_NAV_ITEMS.filter((item) => item.primaryMobile);
  const secondaryItems = WORKSPACE_NAV_ITEMS.filter((item) => !item.primaryMobile);

  return (
    <>
      <nav
        aria-label="Navigasi mobile"
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-slate-200/90 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden dark:border-slate-800/90 dark:bg-slate-950/95"
      >
        {primaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium transition-colors duration-150 select-none ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-5 w-5 shrink-0 transition-transform ${
                      isActive ? 'scale-110' : ''
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-label="Menu lainnya"
          className="relative flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:text-slate-900 select-none dark:text-slate-400 dark:hover:text-slate-100"
        >
          <div className="relative">
            <MoreHorizontal className="h-5 w-5 shrink-0" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-600 shadow-xs" />
            )}
          </div>
          <span>Lainnya</span>
        </button>
      </nav>

      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi tambahan"
          className="fixed inset-0 z-50 flex items-end bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="w-full rounded-t-2xl border-t border-slate-200 bg-white p-5 pb-8 shadow-2xl transition-transform animate-in fade-in slide-in-from-bottom duration-200 dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                Menu Workspace
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-1">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      navigate(item.to);
                    }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Icon className="h-5 w-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="rounded-full bg-rose-600 px-2 py-0.5 font-mono text-[11px] font-bold text-white shadow-xs">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    void signOut();
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
