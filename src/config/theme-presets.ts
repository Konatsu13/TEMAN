// TEMAN theme preset metadata.
// Source of truth for preset identity, naming, and preview swatches.
// Actual color values live in src/styles/themes.css.

export type ThemePresetId =
  | 'teman'
  | 'tokyo-night'
  | 'codex'
  | 'linear'
  | 'github'
  | 'nord'
  | 'dracula';

export interface ThemePresetPreview {
  canvas: string;
  surface: string;
  accent: string;
}

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  preview: ThemePresetPreview;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'teman',
    name: 'TEMAN Default',
    description: 'Identitas Cobalt Blue dan Slate bawaan TEMAN.',
    preview: {
      canvas: 'var(--canvas-bg)',
      surface: 'var(--surface-bg)',
      accent: 'var(--primary)',
    },
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Dark navy dan indigo dengan aksen blue, cyan, dan purple.',
    preview: {
      canvas: 'var(--canvas-bg)',
      surface: 'var(--surface-bg)',
      accent: 'var(--primary)',
    },
  },
  {
    id: 'codex',
    name: 'Codex',
    description: 'Graphite netral dengan aksen teal dan blue untuk workspace coding.',
    preview: {
      canvas: 'var(--canvas-bg)',
      surface: 'var(--surface-bg)',
      accent: 'var(--primary)',
    },
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Graphite dan surface netral dengan aksen violet/blue profesional.',
    preview: {
      canvas: 'var(--canvas-bg)',
      surface: 'var(--surface-bg)',
      accent: 'var(--primary)',
    },
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Surface netral terinspirasi GitHub Light dan Dark.',
    preview: {
      canvas: 'var(--canvas-bg)',
      surface: 'var(--surface-bg)',
      accent: 'var(--primary)',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'Cool slate dan arctic blue dengan kontras seimbang.',
    preview: {
      canvas: 'var(--canvas-bg)',
      surface: 'var(--surface-bg)',
      accent: 'var(--primary)',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    description: 'Dark purple-gray dengan aksen purple, pink, dan cyan.',
    preview: {
      canvas: 'var(--canvas-bg)',
      surface: 'var(--surface-bg)',
      accent: 'var(--primary)',
    },
  },
];

export const DEFAULT_THEME_PRESET: ThemePresetId = 'teman';

export function getThemePreset(id: string | null | undefined): ThemePreset {
  return (
    THEME_PRESETS.find((preset) => preset.id === id) ??
    THEME_PRESETS.find((preset) => preset.id === DEFAULT_THEME_PRESET)!
  );
}

export function isThemePresetId(value: unknown): value is ThemePresetId {
  return (
    typeof value === 'string' &&
    THEME_PRESETS.some((preset) => preset.id === value)
  );
}