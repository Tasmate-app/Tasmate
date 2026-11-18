import type { Href } from 'expo-router';
import type { MobileNavItemId } from '@tasmate/types';
import { NAV_ITEM_META, NAV_ITEM_ORDER } from '@tasmate/design-tokens';

export interface MobileNavItemMeta {
  id: MobileNavItemId;
  href: Href;
  label: string;
  glyph: string;
  dish: string;
}

/**
 * サイドバーに表示する画面のメタ情報。
 * 値は Web と共有する NAV_ITEM_META を正とし、並び順は保存済み設定に従う。
 */
export const MOBILE_NAV_META: Record<MobileNavItemId, MobileNavItemMeta> = Object.fromEntries(
  NAV_ITEM_ORDER.map((id) => {
    const meta = NAV_ITEM_META[id];
    return [
      id,
      {
        id,
        href: meta.path as Href,
        label: meta.label,
        glyph: meta.glyph,
        dish: meta.description,
      },
    ];
  }),
) as Record<MobileNavItemId, MobileNavItemMeta>;
