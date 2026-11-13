import type { Href } from 'expo-router';
import type { MobileNavItemId } from '@tasmate/types';

export interface MobileNavItemMeta {
  id: MobileNavItemId;
  href: Href;
  label: string;
  glyph: string;
  dish: string;
}

/** サイドバーに表示する画面のメタ情報。並び順は保存済み設定に従う */
export const MOBILE_NAV_META: Record<MobileNavItemId, MobileNavItemMeta> = {
  sortie: { id: 'sortie', href: '/', label: '出撃', glyph: '◁', dish: 'クエスト' },
  history: { id: 'history', href: '/history', label: '履歴', glyph: '◷', dish: '作業ログ' },
  base: { id: 'base', href: '/base', label: '拠点', glyph: '⌂', dish: 'シェアハウス' },
  character: {
    id: 'character',
    href: '/character',
    label: 'キャラクター',
    glyph: '✦',
    dish: '仲間',
  },
  inventory: { id: 'inventory', href: '/inventory', label: 'かばん', glyph: '✧', dish: '所持品' },
};