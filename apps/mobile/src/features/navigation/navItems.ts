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
  home: { id: 'home', href: '/', label: 'ホーム', glyph: '◁', dish: 'クエスト' },
  history: { id: 'history', href: '/history', label: '履歴', glyph: '◷', dish: '作業ログ' },
  plan: { id: 'plan', href: '/plan', label: '計画', glyph: '▦', dish: '週間予定' },
  base: { id: 'base', href: '/base', label: '拠点', glyph: '⌂', dish: 'シェアハウス' },
  character: {
    id: 'character',
    href: '/character',
    label: 'キャラクター',
    glyph: '✦',
    dish: '仲間',
  },
  facilities: {
    id: 'facilities',
    href: '/facilities',
    label: '施設',
    glyph: '⬢',
    dish: '生産・強化',
  },
  inventory: { id: 'inventory', href: '/inventory', label: 'かばん', glyph: '✧', dish: '所持品' },
  shop: { id: 'shop', href: '/shop', label: 'ショップ', glyph: '◈', dish: '強化' },
  synthesis: { id: 'synthesis', href: '/synthesis', label: '合成', glyph: '⚗', dish: '結晶づくり' },
};
