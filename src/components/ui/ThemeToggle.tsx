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
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-offset-slate-950 ${
        !showLabel ? 'w-9 px-0' : ''
      } ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-slate-600" aria-hidden="true" />
      )}
      {showLabel && <span>{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>}
    </button>
  );
}
