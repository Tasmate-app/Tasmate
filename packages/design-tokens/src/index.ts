import type {
  CharacterAttribute,
  ItemRarity,
  TaskStatus,
} from '@tasmate/types';

/**
 * Tasmate 共通デザイントークン。
 * モバイル版を正とし、Web 版もこの値を使用する。
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

/**
 * カテゴリー色。ユーザーがカテゴリーを追加できるため、
 * 固定名ではなく ID のハッシュでパレットを割り当てる。
 */
export const categoryPalette = [
  '#0891b2',
  '#4f46e5',
  '#0f9f6e',
  '#d97706',
  '#7c3aed',
  '#c026d3',
  '#0284c7',
  '#64748b',
] as const;

export function categoryColorFor(key: string): string {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return categoryPalette[hash % categoryPalette.length];
}

export const rarityPalette: Record<ItemRarity, { color: string; soft: string; label: string }> = {
  N: { color: '#64748b', soft: '#eef2f7', label: 'ノーマル' },
  R: { color: '#0284c7', soft: '#e0f2fe', label: 'レア' },
  SR: { color: '#7c3aed', soft: '#ede9fe', label: 'スーパーレア' },
  SSR: { color: '#d97706', soft: '#fef3c7', label: 'スペシャル' },
  UR: { color: '#e11d48', soft: '#ffe4e6', label: 'ウルトラレア' },
};

export const taskStatusPalette: Record<TaskStatus, { color: string; soft: string; label: string }> = {
  planned: { color: '#587195', soft: '#eef4fa', label: '予定' },
  active: { color: '#12a878', soft: '#d9f8ec', label: '進行中' },
  interrupted: { color: '#c47a0a', soft: '#fff1d3', label: '中断中' },
  completed: { color: '#1aa3df', soft: '#e8f9ff', label: '完了' },
  cancelled: { color: '#e04669', soft: '#ffe4ea', label: '中止' },
};

export const resourcePalette = {
  currency: { color: '#8a5600', soft: colors.goldSoft, glyph: '◈', label: '通貨' },
  stardust: { color: colors.accent, soft: colors.accentSoft, glyph: '✦', label: '星屑' },
  shard_sun: { color: attributePalette.sun.color, soft: colors.goldSoft, glyph: attributePalette.sun.glyph, label: '太陽' },
  shard_moon: { color: attributePalette.moon.color, soft: colors.accentSoft, glyph: attributePalette.moon.glyph, label: '月' },
  shard_star: { color: attributePalette.star.color, soft: colors.pinkSoft, glyph: attributePalette.star.glyph, label: '星' },
} as const;

export type ResourceId = keyof typeof resourcePalette;

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

/**
 * 画面幅の基準。
 * Web は 768px 未満でドロワー、以上で常設サイドバーに切り替える。
 */
export const breakpoints = {
  compact: 480,
  drawer: 768,
  wide: 1024,
  maxContent: 1200,
} as const;

/** 共通コントロールの寸法。タッチ領域は 44px 以上を確保する */
export const control = {
  minTouch: 44,
  fieldHeight: 48,
  iconButton: 40,
  hudHeight: 56,
  sidebarWidth: 248,
  navItemHeight: 48,
} as const;

/** Android の elevation と Web の shadow を対応させるための段階 */
export const elevation = {
  none: 0,
  low: 2,
  medium: 8,
  high: 16,
} as const;

/**
 * タイポグラフィの最小セット。
 * Web の rem 直値と Native の px 直値をこの段階へ寄せる。
 */
export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 26, fontWeight: '400' },
  bodySmall: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
} as const;

export type TypographyRole = keyof typeof typography;


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
  '--font-weight-regular': fontWeight.regular,
  '--font-weight-medium': fontWeight.medium,
  '--font-weight-bold': fontWeight.bold,
  '--font-weight-black': fontWeight.black,
  '--line-height-display': `${typography.display.lineHeight}px`,
  '--line-height-title': `${typography.title.lineHeight}px`,
  '--line-height-heading': `${typography.heading.lineHeight}px`,
  '--line-height-body': `${typography.body.lineHeight}px`,
  '--line-height-body-small': `${typography.bodySmall.lineHeight}px`,
  '--line-height-label': `${typography.label.lineHeight}px`,
  '--line-height-caption': `${typography.caption.lineHeight}px`,
  '--font-display': `${typography.display.fontSize}px`,
  '--font-title': `${typography.title.fontSize}px`,
  '--font-heading': `${typography.heading.fontSize}px`,
  '--font-body': `${typography.body.fontSize}px`,
  '--font-body-small': `${typography.bodySmall.fontSize}px`,
  '--font-label': `${typography.label.fontSize}px`,
  '--font-caption': `${typography.caption.fontSize}px`,
  '--breakpoint-compact': `${breakpoints.compact}px`,
  '--breakpoint-drawer': `${breakpoints.drawer}px`,
  '--breakpoint-wide': `${breakpoints.wide}px`,
  '--control-min-touch': `${control.minTouch}px`,
  '--control-field-height': `${control.fieldHeight}px`,
  '--control-icon-button': `${control.iconButton}px`,
  '--hud-height': `${control.hudHeight}px`,
  '--sidebar-width': `${control.sidebarWidth}px`,
  '--nav-item-height': `${control.navItemHeight}px`,
  '--cat-1': categoryPalette[0],
  '--cat-2': categoryPalette[1],
  '--cat-3': categoryPalette[2],
  '--cat-4': categoryPalette[3],
  '--cat-5': categoryPalette[4],
  '--rarity-n': rarityPalette.N.color,
  '--rarity-r': rarityPalette.R.color,
  '--rarity-sr': rarityPalette.SR.color,
  '--rarity-ssr': rarityPalette.SSR.color,
  '--rarity-ur': rarityPalette.UR.color,
  '--status-planned': taskStatusPalette.planned.color,
  '--status-active': taskStatusPalette.active.color,
  '--status-interrupted': taskStatusPalette.interrupted.color,
  '--status-completed': taskStatusPalette.completed.color,
  '--status-cancelled': taskStatusPalette.cancelled.color,
};

export * from './navigation';
