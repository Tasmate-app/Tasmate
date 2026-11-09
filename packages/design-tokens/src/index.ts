import type { CharacterAttribute } from '@tasmate/types';

/**
 * Tasmate 共通デザイントークン。
 * モバイル版の Blue Archive 風デザインを正とし、Web 版もこの値を使用する。
 * 値はプラットフォーム非依存（色・余白・角丸・影・モーション）に保つ。
 */
export const colors = {
  background: '#e7f5ff',
  backgroundDeep: '#cfeaff',
  backgroundWash: '#f8fcff',
  sky: '#72d7ff',
  skyDeep: '#3bb8ef',
  surface: '#ffffff',
  surfaceMuted: '#f0faff',
  surfaceAlt: '#ddf3ff',
  surfaceGlass: 'rgba(255, 255, 255, 0.84)',
  surfaceGlassStrong: 'rgba(255, 255, 255, 0.94)',
  primary: '#1aa3df',
  primaryDark: '#0b76a8',
  primaryDeep: '#064e70',
  primarySoft: '#c9efff',
  primaryPale: '#e8f9ff',
  secondary: '#25c6b3',
  secondarySoft: '#d6fbf3',
  accent: '#8b7cff',
  accentSoft: '#ece8ff',
  gold: '#ffc247',
  goldSoft: '#fff4d2',
  orange: '#ff9b5a',
  orangeSoft: '#ffead9',
  pink: '#ff7fb4',
  pinkSoft: '#ffe6f1',
  text: '#14294d',
  textMuted: '#587195',
  textSubtle: '#8aa1bd',
  border: '#c6e9fa',
  borderStrong: '#8ed8f4',
  success: '#12a878',
  successSoft: '#d9f8ec',
  warning: '#c47a0a',
  warningSoft: '#fff1d3',
  danger: '#e04669',
  dangerSoft: '#ffe4ea',
  white: '#ffffff',
  overlay: 'rgba(9, 38, 64, 0.45)',
  shadow: '#0d4a70',
  navInactive: '#8aa0bb',
  decorationSky: 'rgba(114, 215, 255, 0.36)',
  decorationMint: 'rgba(167, 243, 208, 0.24)',
  decorationLilac: 'rgba(196, 181, 253, 0.22)',
  decorationGold: 'rgba(255, 213, 128, 0.22)',
  highlight: 'rgba(255, 255, 255, 0.58)',
} as const;

export const attributePalette: Record<
  CharacterAttribute,
  { color: string; soft: string; deep: string; glyph: string; label: string }
> = {
  sun: { color: '#f0a222', soft: '#fff4d8', deep: '#9b6100', glyph: '☀', label: '太陽' },
  moon: { color: '#8272f5', soft: '#ece9ff', deep: '#4b3bc0', glyph: '☾', label: '月' },
  star: { color: '#f5659d', soft: '#ffe7f1', deep: '#b32461', glyph: '★', label: '星' },
  none: { color: '#94a3b8', soft: '#eef2f7', deep: '#5b6b8c', glyph: '◇', label: '無' },
};

export function attributeColor(attribute: CharacterAttribute | undefined): string {
  return attributePalette[attribute ?? 'none'].color;
}

export function withAlpha(hex: string, opacity: number): string {
  const clamped = Math.round(Math.max(0, Math.min(1, opacity)) * 255);
  return `${hex}${clamped.toString(16).padStart(2, '0')}`;
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
  xl: 26,
  xxl: 32,
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
  display: 38,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '600',
  bold: '700',
  black: '900',
} as const;

export const layout = {
  screenPadding: spacing.lg,
  hudMinHeight: 50,
  hudHeight: 58,
  tabBarHeight: 64,
  tabBarPadding: 14,
  contentGap: spacing.md,
  sectionGap: spacing.lg,
} as const;

export const motion = {
  fast: 140,
  base: 240,
  slow: 380,
} as const;

export const shadows = {
  card: {
    boxShadow: '0 10px 24px rgba(13, 74, 112, 0.10)',
  },
  soft: {
    boxShadow: '0 4px 12px rgba(13, 74, 112, 0.07)',
  },
  floating: {
    boxShadow: '0 16px 34px rgba(13, 74, 112, 0.18)',
  },
  glow: {
    boxShadow: '0 8px 20px rgba(26, 163, 223, 0.30)',
  },
  gold: {
    boxShadow: '0 8px 20px rgba(255, 194, 71, 0.30)',
  },
  accent: {
    boxShadow: '0 8px 20px rgba(139, 124, 255, 0.28)',
  },
} as const;

export const gradients = {
  primary: [colors.sky, colors.primary, colors.primaryDark],
  gold: [colors.goldSoft, colors.gold, colors.orange],
  accent: [colors.accentSoft, colors.accent],
  success: [colors.successSoft, colors.success],
} as const;

/**
 * Web の CSS 変数へ流し込むための対応表。
 * 値の二重管理を避けるため、実行時に :root へ適用する。
 */
export const cssVariables: Record<string, string> = {
  '--color-background': colors.background,
  '--color-background-deep': colors.backgroundDeep,
  '--color-background-wash': colors.backgroundWash,
  '--color-sky': colors.sky,
  '--color-sky-deep': colors.skyDeep,
  '--color-surface': colors.surface,
  '--color-surface-muted': colors.surfaceMuted,
  '--color-surface-alt': colors.surfaceAlt,
  '--color-surface-glass': colors.surfaceGlass,
  '--color-surface-glass-strong': colors.surfaceGlassStrong,
  '--color-primary': colors.primary,
  '--color-primary-dark': colors.primaryDark,
  '--color-primary-deep': colors.primaryDeep,
  '--color-primary-soft': colors.primarySoft,
  '--color-primary-pale': colors.primaryPale,
  '--color-secondary': colors.secondary,
  '--color-secondary-soft': colors.secondarySoft,
  '--color-accent': colors.accent,
  '--color-accent-soft': colors.accentSoft,
  '--color-gold': colors.gold,
  '--color-gold-soft': colors.goldSoft,
  '--color-orange': colors.orange,
  '--color-orange-soft': colors.orangeSoft,
  '--color-pink': colors.pink,
  '--color-pink-soft': colors.pinkSoft,
  '--color-text': colors.text,
  '--color-text-muted': colors.textMuted,
  '--color-text-subtle': colors.textSubtle,
  '--color-border': colors.border,
  '--color-border-strong': colors.borderStrong,
  '--color-success': colors.success,
  '--color-success-soft': colors.successSoft,
  '--color-warning': colors.warning,
  '--color-warning-soft': colors.warningSoft,
  '--color-danger': colors.danger,
  '--color-danger-soft': colors.dangerSoft,
  '--color-white': colors.white,
  '--color-overlay': colors.overlay,
  '--color-shadow': colors.shadow,
  '--color-nav-inactive': colors.navInactive,
  '--color-decoration-sky': colors.decorationSky,
  '--color-decoration-mint': colors.decorationMint,
  '--color-decoration-lilac': colors.decorationLilac,
  '--color-decoration-gold': colors.decorationGold,
  '--color-highlight': colors.highlight,
  '--attr-sun': attributePalette.sun.color,
  '--attr-moon': attributePalette.moon.color,
  '--attr-star': attributePalette.star.color,
  '--attr-none': attributePalette.none.color,
  '--space-xs': `${spacing.xs}px`,
  '--space-sm': `${spacing.sm}px`,
  '--space-md': `${spacing.md}px`,
  '--space-lg': `${spacing.lg}px`,
  '--space-xl': `${spacing.xl}px`,
  '--space-xxl': `${spacing.xxl}px`,
  '--radius-sm': `${radius.sm}px`,
  '--radius-md': `${radius.md}px`,
  '--radius-lg': `${radius.lg}px`,
  '--radius-xl': `${radius.xl}px`,
  '--radius-xxl': `${radius.xxl}px`,
  '--radius-pill': `${radius.pill}px`,
  '--font-size-xs': `${fontSize.xs}px`,
  '--font-size-sm': `${fontSize.sm}px`,
  '--font-size-md': `${fontSize.md}px`,
  '--font-size-lg': `${fontSize.lg}px`,
  '--font-size-xl': `${fontSize.xl}px`,
  '--font-size-xxl': `${fontSize.xxl}px`,
  '--font-size-hero': `${fontSize.hero}px`,
  '--font-size-display': `${fontSize.display}px`,
  '--anim-fast': `${motion.fast}ms`,
  '--anim-base': `${motion.base}ms`,
  '--anim-slow': `${motion.slow}ms`,
  '--shadow-soft': shadows.soft.boxShadow,
  '--shadow-card': shadows.card.boxShadow,
  '--shadow-floating': shadows.floating.boxShadow,
  '--shadow-glow': shadows.glow.boxShadow,
  '--shadow-gold': shadows.gold.boxShadow,
  '--shadow-accent': shadows.accent.boxShadow,
};
