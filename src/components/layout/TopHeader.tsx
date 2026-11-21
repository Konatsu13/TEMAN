import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Search, Wifi, WifiOff, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getInitials } from '../../utils/formatters';
import { getProfileColorText, isValidProfileColor } from '../../utils/profileColor';
import { BrandLogo } from '../shared/BrandLogo';
import { Badge } from '../ui/Badge';
import { ThemeToggle } from '../ui/ThemeToggle';
import { WORKSPACE_NAV_ITEMS } from './navigation';

export function TopHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const isOnline = useOnlineStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const profileContainerRef = useRef<HTMLDivElement | null>(null);

  const currentNav =
    WORKSPACE_NAV_ITEMS.find((item) => pathname.startsWith(item.to)) ??
    WORKSPACE_NAV_ITEMS[0];

  const matchingNavItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return WORKSPACE_NAV_ITEMS;
    return WORKSPACE_NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((prev) => !prev);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (event.key === 'Escape') {
        setSearchOpen(false);
        setProfileMenuOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
      if (
        profileContainerRef.current &&
        !profileContainerRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isOwner = role === 'owner';

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--surface-border)] bg-[var(--surface-bg)]/95 px-4 backdrop-blur-md lg:h-16 lg:px-8">
      {/* Left: Brand (Mobile) & Context Title */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="lg:hidden">
          <BrandLogo size="sm" showWordmark={false} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-base font-bold text-slate-900 lg:text-lg dark:text-slate-100">
              {currentNav.label}
            </h1>
            <span className="hidden font-mono text-[11px] text-slate-400 sm:inline dark:text-slate-500">
              · WIB
            </span>
          </div>
        </div>
      </div>

      {/* Right: Online Status, Quick Search, Theme Toggle, Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Online / Offline status */}
        <div
          role="status"
          aria-live="polite"
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 transition-colors ${
            isOnline
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          {isOnline ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          )}
          <span className="text-[10px] font-semibold tracking-wide whitespace-nowrap uppercase">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Mobile Search Button */}
        <button
          type="button"
          onClick={() => {
            setSearchOpen(true);
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }}
          aria-label="Cari menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 md:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Desktop Search Bar with Cmd/Ctrl+K */}
        <div ref={searchContainerRef} className="relative hidden md:block">
          <label htmlFor="workspace-search" className="sr-only">
            Cari halaman atau fitur
          </label>
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              id="workspace-search"
              type="search"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              placeholder="Cari menu workspace..."
              className="h-9 w-60 rounded-lg border border-slate-200/90 bg-slate-50/80 pl-9 pr-12 text-xs text-slate-900 placeholder:text-slate-400 transition-all focus:w-72 focus:border-[var(--primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/15 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[var(--primary)] dark:focus:bg-slate-900 dark:focus:ring-[var(--primary)]/20"
            />
            <kbd className="pointer-events-none absolute right-2.5 hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400 sm:inline-block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              ⌘K
            </kbd>
          </div>

          {searchOpen && (
            <div
              role="listbox"
              aria-label="Hasil pencarian menu"
              className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                Navigasi Cepat
              </div>
              <div className="max-h-64 space-y-0.5 overflow-y-auto">
                {matchingNavItems.length > 0 ? (
                  matchingNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          navigate(item.to);
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {item.label}
                          </div>
                          <div className="truncate text-[11px] text-slate-400">
                            {item.description}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Tidak ditemukan menu "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ''}`}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-[10px] font-bold text-white shadow-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Theme Switcher */}
        <ThemeToggle showLabel={false} />

        {/* Mobile Profile Dropdown Trigger */}
        <div ref={profileContainerRef} className="relative lg:hidden">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            aria-expanded={profileMenuOpen}
            aria-label="Menu akun"
            className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-xs font-bold text-white shadow-2xs"
            style={
              profile?.profile_background_color &&
              isValidProfileColor(profile.profile_background_color)
                ? {
                    backgroundColor: profile.profile_background_color,
                    color: getProfileColorText(profile.profile_background_color),
                  }
                : {
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-contrast)',
                  }
            }
          >
            {getInitials(profile?.full_name)}
          </button>

          {profileMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                <div className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                  {profile?.full_name ?? 'Pengguna TEMAN'}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <Badge variant={isOwner ? 'primary' : 'default'} size="sm">
                    {isOwner ? 'Owner' : 'Member'}
                  </Badge>
                </div>
              </div>
              <div className="pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Pengaturan Akun
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    void signOut();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Modal Overlay */}
      {searchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pencarian cepat"
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/60 p-4 backdrop-blur-xs md:hidden"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik menu yang dicari..."
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {matchingNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate(item.to);
                      setSearchOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Icon className="h-4 w-4 text-[var(--primary)]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                        {item.label}
                      </div>
                      <div className="truncate text-[11px] text-slate-400">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
