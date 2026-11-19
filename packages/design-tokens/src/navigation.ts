import type { MobileNavItemId } from '@tasmate/types';

export type NavIconName =
  | 'home'
  | 'sortie'
  | 'calendar'
  | 'companions'
  | 'facility'
  | 'shop'
  | 'storage'
  | 'synthesis'
  | 'history'
  | 'categories'
  | 'settings';

export interface NavItemMeta {
  id: MobileNavItemId;
  /** 画面遷移先。Web・Native で同じパスを使う */
  path: string;
  label: string;
  /** 1行の補足。サイドバーの副題と読み上げに使う */
  description: string;
  /** Web のアイコン名 */
  icon: NavIconName;
  /** Native のグリフ。フォント差異を避けるため装飾用途に限定する */
  glyph: string;
}

/**
 * Web・Native 共通のナビゲーション定義。
 * 並び順と表示可否はユーザー設定（settings.navigationItems）に従う。
 */
export const NAV_ITEM_META: Record<MobileNavItemId, NavItemMeta> = {
  home: {
    id: 'home',
    path: '/',
    label: 'ホーム',
    description: 'クエスト',
    icon: 'sortie',
    glyph: '◁',
  },
  history: {
    id: 'history',
    path: '/history',
    label: '履歴',
    description: '作業ログ',
    icon: 'history',
    glyph: '◷',
  },
  plan: {
    id: 'plan',
    path: '/plan',
    label: '計画',
    description: '週間予定',
    icon: 'calendar',
    glyph: '▦',
  },
  base: {
    id: 'base',
    path: '/base',
    label: '拠点',
    description: 'シェアハウス',
    icon: 'home',
    glyph: '⌂',
  },
  character: {
    id: 'character',
    path: '/character',
    label: 'キャラクター',
    description: '仲間',
    icon: 'companions',
    glyph: '✦',
  },
  facilities: {
    id: 'facilities',
    path: '/facilities',
    label: '施設',
    description: '生産・強化',
    icon: 'facility',
    glyph: '⬢',
  },
  inventory: {
    id: 'inventory',
    path: '/inventory',
    label: 'かばん',
    description: '所持品',
    icon: 'storage',
    glyph: '✧',
  },
  shop: {
    id: 'shop',
    path: '/shop',
    label: 'ショップ',
    description: '強化',
    icon: 'shop',
    glyph: '◈',
  },
  synthesis: {
    id: 'synthesis',
    path: '/synthesis',
    label: '合成',
    description: '結晶づくり',
    icon: 'synthesis',
    glyph: '⚗',
  },
};

export const NAV_ITEM_ORDER: readonly MobileNavItemId[] = [
  'home',
  'history',
  'plan',
  'base',
  'character',
  'facilities',
  'inventory',
  'shop',
  'synthesis',
];

export function navItemMeta(id: MobileNavItemId): NavItemMeta {
  return NAV_ITEM_META[id];
}
