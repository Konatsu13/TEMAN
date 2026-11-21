import {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../hooks/useAuth';
import type { ThemePresetId } from '../config/theme-presets';
import { getThemePreset, isThemePresetId } from '../config/theme-presets';
import { updateThemePreset } from '../services/authService';

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  theme: ThemeMode;
  themePreset: ThemePresetId;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
  setThemePreset: (next: ThemePresetId) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'teman_theme';
const THEME_PRESET_STORAGE_KEY = 'teman_theme_preset';
const DEFAULT_THEME_PRESET: ThemePresetId = 'teman';

function readInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Ignore storage read errors
  }
  return 'light';
}

function readInitialThemePreset(): ThemePresetId {
  if (typeof window === 'undefined') return DEFAULT_THEME_PRESET;
  try {
    const saved = localStorage.getItem(THEME_PRESET_STORAGE_KEY);
    if (isThemePresetId(saved)) return saved;
  } catch {
    // Ignore storage read errors
  }
  return DEFAULT_THEME_PRESET;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme);
  const [themePreset, setThemePresetState] = useState<ThemePresetId>(
    readInitialThemePreset,
  );

  // Apply theme + preset to the document and persist to localStorage.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.setAttribute('data-theme-preset', themePreset);

    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (themeColor) {
      const canvasBg = getComputedStyle(root)
        .getPropertyValue('--canvas-bg')
        .trim();
      if (canvasBg) themeColor.content = canvasBg;
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(THEME_PRESET_STORAGE_KEY, themePreset);
    } catch {
      // Ignore storage write errors
    }
  }, [theme, themePreset]);

  // Sync preset from the authenticated profile once it has loaded.
  // Never reset to default while the profile is still loading.
  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (!profile) return;
    const remotePreset = profile.theme_preset;
    if (isThemePresetId(remotePreset) && remotePreset !== themePreset) {
      setThemePresetState(remotePreset);
      try {
        localStorage.setItem(THEME_PRESET_STORAGE_KEY, remotePreset);
      } catch {
        // Ignore storage write errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user?.id, profile?.theme_preset]);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setThemePreset = useCallback(
    (next: ThemePresetId) => {
      if (!isThemePresetId(next)) {
        throw new Error('Preset tema tidak valid.');
      }
      setThemePresetState(next);
      try {
        localStorage.setItem(THEME_PRESET_STORAGE_KEY, next);
      } catch {
        // Ignore storage write errors
      }

      if (user) {
        return updateThemePreset(user.id, next);
      }
      return Promise.resolve();
    },
    [user],
  );

  const value = useMemo(
    () => ({ theme, themePreset, setTheme, toggleTheme, setThemePreset }),
    [theme, themePreset, setTheme, toggleTheme, setThemePreset],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// Keep getThemePreset import used for type narrowing consumers; re-export for convenience.
export { getThemePreset };