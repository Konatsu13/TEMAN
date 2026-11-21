import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
      title={isDark ? 'Mode Terang' : 'Mode Gelap'}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-bg)] px-2.5 text-xs font-medium text-[var(--text-sub)] whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 ${
        !showLabel ? 'w-9 px-0' : ''
      } ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-[var(--text-sub)]" aria-hidden="true" />
      )}
      {showLabel && <span>{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>}
    </button>
  );
}
