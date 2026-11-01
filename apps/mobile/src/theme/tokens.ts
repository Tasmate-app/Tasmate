import type { CharacterAttribute } from '@tasmate/types';

export const colors = {
  background: '#eaf7ff',
  backgroundDeep: '#d9f0ff',
  surface: '#ffffff',
  surfaceMuted: '#f4fbff',
  surfaceAlt: '#e6f6ff',
  primary: '#0891b2',
  primaryDark: '#0e7490',
  primarySoft: '#d3f3ff',
  primaryPale: '#ecfbff',
  secondary: '#0d9488',
  secondarySoft: '#d6f5f1',
  accent: '#4f46e5',
  accentSoft: '#e3e7ff',
  text: '#0c1b3d',
  textMuted: '#5b6b8c',
  textSubtle: '#8190aa',
  border: '#c7e8f7',
  borderStrong: '#9fd8ef',
  success: '#0f9f6e',
  successSoft: '#d9f8ec',
  warning: '#c2740b',
  warningSoft: '#fff1d6',
  danger: '#d93b3b',
  dangerSoft: '#ffe4e4',
  white: '#ffffff',
  overlay: 'rgba(6, 32, 56, 0.45)',
  shadow: '#0c4a6e',
} as const;

export const attributePalette: Record<
  CharacterAttribute,
  { color: string; soft: string; glyph: string; label: string }
> = {
  sun: { color: '#f59e0b', soft: '#fff3d6', glyph: '☀', label: '太陽' },
  moon: { color: '#818cf8', soft: '#e9ebff', glyph: '☾', label: '月' },
  star: { color: '#f472b6', soft: '#ffe4f1', glyph: '★', label: '星' },
  none: { color: '#94a3b8', soft: '#eef2f7', glyph: '◇', label: '無' },
};

export function attributeColor(attribute: CharacterAttribute | undefined): string {
  return attributePalette[attribute ?? 'none'].color;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 26,
  hero: 32,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  floating: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;
