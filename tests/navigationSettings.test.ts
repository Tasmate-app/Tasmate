import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NAVIGATION_ITEMS,
  MOBILE_NAV_ITEM_IDS,
  PINNED_MOBILE_NAV_ITEM_ID,
  createDefaultNavigationItems,
  moveNavigationItem,
  normalizeNavigationItems,
  setNavigationItemVisible,
  visibleNavigationItems,
} from '@tasmate/core';

describe('モバイルサイドバーの設定ロジック', () => {
  it('既定では6項目すべてを既定順で表示する', () => {
    const items = createDefaultNavigationItems();
    expect(items.map((item) => item.id)).toEqual([...MOBILE_NAV_ITEM_IDS]);
    expect(items.every((item) => item.visible)).toBe(true);
    expect(createDefaultNavigationItems()).not.toBe(DEFAULT_NAVIGATION_ITEMS);
  });

  it('未保存・不正な設定は既定値へ補完する', () => {
    expect(normalizeNavigationItems(undefined)).toEqual(createDefaultNavigationItems());
    expect(normalizeNavigationItems('invalid')).toEqual(createDefaultNavigationItems());
    expect(normalizeNavigationItems([])).toEqual(createDefaultNavigationItems());
  });

  it('未知のIDと重複を除去し、欠損項目を補完する', () => {
    const normalized = normalizeNavigationItems([
      { id: 'inventory', visible: false },
      { id: 'unknown', visible: true },
      { id: 'inventory', visible: true },
      null,
    ]);

    expect(normalized.map((item) => item.id)).toEqual([
      'inventory',
      'sortie',
      'history',
      'base',
      'character',
      'synthesis',
    ]);
    expect(normalized.find((item) => item.id === 'inventory')?.visible).toBe(false);
  });

  it('出撃は非表示にできず、正規化でも表示へ戻す', () => {
    expect(
      setNavigationItemVisible(createDefaultNavigationItems(), PINNED_MOBILE_NAV_ITEM_ID, false),
    ).toEqual(createDefaultNavigationItems());

    const normalized = normalizeNavigationItems([
      { id: PINNED_MOBILE_NAV_ITEM_ID, visible: false },
      { id: 'history', visible: false },
    ]);
    expect(normalized.find((item) => item.id === PINNED_MOBILE_NAV_ITEM_ID)?.visible).toBe(true);
    expect(normalized.find((item) => item.id === 'history')?.visible).toBe(false);
  });

  it('表示項目だけを元の順序で取り出す', () => {
    const items = normalizeNavigationItems([
      { id: 'character', visible: true },
      { id: 'sortie', visible: true },
      { id: 'history', visible: false },
      { id: 'base', visible: false },
      { id: 'inventory', visible: true },
    ]);
    expect(visibleNavigationItems(items).map((item) => item.id)).toEqual([
      'character',
      'sortie',
      'inventory',
      'synthesis',
    ]);
  });

  it('上下に並べ替え、端では順序を変えない', () => {
    const items = createDefaultNavigationItems();
    expect(moveNavigationItem(items, 'inventory', 'up').map((item) => item.id)).toEqual([
      'sortie',
      'history',
      'base',
      'inventory',
      'character',
      'synthesis',
    ]);
    expect(moveNavigationItem(items, 'history', 'up').map((item) => item.id)).toEqual([
      'history',
      'sortie',
      'base',
      'character',
      'inventory',
      'synthesis',
    ]);
    expect(moveNavigationItem(items, 'sortie', 'up')).toEqual(items);
    expect(moveNavigationItem(items, 'synthesis', 'down')).toEqual(items);
  });
});