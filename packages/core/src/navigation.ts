import type { MobileNavItemId, MobileNavItemPreference } from '@tasmate/types';

/**
 * モバイル版サイドバーの項目定義。
 * 表示順は AppSettings.navigationItems の順序に従う。
 */
export const MOBILE_NAV_ITEM_IDS: readonly MobileNavItemId[] = [
  'sortie',
  'history',
  'base',
  'character',
  'inventory',
];

/** 起動直後の画面である出撃は常に表示する */
export const PINNED_MOBILE_NAV_ITEM_ID: MobileNavItemId = 'sortie';

export const DEFAULT_NAVIGATION_ITEMS: readonly MobileNavItemPreference[] = [
  { id: 'sortie', visible: true },
  { id: 'history', visible: true },
  { id: 'base', visible: true },
  { id: 'character', visible: true },
  { id: 'inventory', visible: true },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMobileNavItemId(value: unknown): value is MobileNavItemId {
  return typeof value === 'string' && MOBILE_NAV_ITEM_IDS.includes(value as MobileNavItemId);
}

export function createDefaultNavigationItems(): MobileNavItemPreference[] {
  return DEFAULT_NAVIGATION_ITEMS.map((item) => ({ ...item }));
}

/**
 * 保存データの並び順を維持しつつ、不明な項目・重複を除去する。
 * 欠損した項目は既定順の末尾へ補完し、出撃は必ず表示状態にする。
 */
export function normalizeNavigationItems(value: unknown): MobileNavItemPreference[] {
  const source = Array.isArray(value) ? value : [];
  const items: MobileNavItemPreference[] = [];
  const seen = new Set<MobileNavItemId>();

  for (const entry of source) {
    if (!isRecord(entry)) continue;
    const id = entry['id'];
    if (!isMobileNavItemId(id) || seen.has(id)) continue;
    items.push({ id, visible: entry['visible'] !== false });
    seen.add(id);
  }

  for (const id of MOBILE_NAV_ITEM_IDS) {
    if (seen.has(id)) continue;
    items.push({ id, visible: true });
  }

  return items.map((item) =>
    item.id === PINNED_MOBILE_NAV_ITEM_ID ? { ...item, visible: true } : item,
  );
}

export function visibleNavigationItems(
  items: readonly MobileNavItemPreference[],
): MobileNavItemPreference[] {
  return items.filter((item) => item.visible);
}

export function setNavigationItemVisible(
  items: readonly MobileNavItemPreference[],
  id: MobileNavItemId,
  visible: boolean,
): MobileNavItemPreference[] {
  if (id === PINNED_MOBILE_NAV_ITEM_ID && !visible) return [...items];
  return items.map((item) => (item.id === id ? { ...item, visible } : item));
}

/** 1つ上または下へ移動する。端にある場合や対象が存在しない場合は内容を変えずに返す */
export function moveNavigationItem(
  items: readonly MobileNavItemPreference[],
  id: MobileNavItemId,
  direction: 'up' | 'down',
): MobileNavItemPreference[] {
  const index = items.findIndex((item) => item.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= items.length) return [...items];

  const next = items.map((item) => ({ ...item }));
  const current = next[index];
  next[index] = next[target];
  next[target] = current;
  return next;
}