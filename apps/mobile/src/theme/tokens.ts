import type { CharacterAttribute } from '@tasmate/types';

export const colors = {
  background: '#eaf7ff',
  backgroundDeep: '#d7effc',
  backgroundWash: '#f7fcff',
  surface: '#ffffff',
  surfaceMuted: '#f2fbff',
  surfaceAlt: '#e2f5fd',
  surfaceGlass: 'rgba(255, 255, 255, 0.86)',
  primary: '#0a9fbf',
  primaryDark: '#087a94',
  primaryDeep: '#065e75',
  primarySoft: '#cdf2fb',
  primaryPale: '#eafaff',
  secondary: '#12b3a0',
  secondarySoft: '#d3f7f0',
  accent: '#7c6cf0',
  accentSoft: '#e8e4ff',
  gold: '#f4b73f',
  goldSoft: '#fff3d1',
  text: '#0b1b3a',
  textMuted: '#566b8c',
  textSubtle: '#8496b0',
  border: '#c4e8f6',
  borderStrong: '#8fd5ee',
  success: '#0f9f6e',
  successSoft: '#d8f8eb',
  warning: '#c2740b',
  warningSoft: '#fff1d4',
  danger: '#d93b5c',
  dangerSoft: '#ffe4ea',
  white: '#ffffff',
  overlay: 'rgba(5, 32, 54, 0.48)',
  shadow: '#0c4a6e',
  navInactive: '#7f93ad',
  decorationSky: 'rgba(125, 211, 252, 0.34)',
  decorationMint: 'rgba(167, 243, 208, 0.26)',
  decorationLilac: 'rgba(196, 181, 253, 0.22)',
  highlight: 'rgba(255, 255, 255, 0.55)',
} as const;

export const attributePalette: Record<
  CharacterAttribute,
  { color: string; soft: string; deep: string; glyph: string; label: string }
> = {
  sun: { color: '#efa52c', soft: '#fff4d8', deep: '#a86a00', glyph: '☀', label: '太陽' },
  moon: { color: '#7c6cf0', soft: '#ece9ff', deep: '#4f3fc4', glyph: '☾', label: '月' },
  star: { color: '#ef5f9b', soft: '#ffe7f1', deep: '#b32461', glyph: '★', label: '星' },
  none: { color: '#94a3b8', soft: '#eef2f7', deep: '#5b6b8c', glyph: '◇', label: '無' },
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

export const layout = {
  screenPadding: 16,
  hudMinHeight: 54,
  tabBarHeight: 60,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;
