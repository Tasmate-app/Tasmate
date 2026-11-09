import type { Inventory, ItemInventory, MaterialId } from '@tasmate/types';
import { COIN_ITEM_ID } from './inventoryManager';
import { addItem, getItemQuantity, normalizeItemInventory } from './inventoryManager';

/**
 * 既存の `Inventory`（currency + materials）と新しい共通インベントリの橋渡し。
 * 旧保存データからアイテム所持数を復元し、既存UI用の通貨・素材と整合させる。
 */

const LEGACY_MATERIAL_ITEM_IDS: readonly MaterialId[] = ['shard_sun', 'shard_moon', 'shard_star'];

/** 旧 Inventory から新しいアイテム所持数を生成する */
export function itemInventoryFromLegacy(legacy: Inventory): ItemInventory {
  let items: ItemInventory = {};
  const currency = Math.max(0, Math.floor(legacy.currency));
  if (currency > 0) items = addItem(items, COIN_ITEM_ID, currency);
  for (const materialId of LEGACY_MATERIAL_ITEM_IDS) {
    const amount = Math.max(0, Math.floor(legacy.materials[materialId] ?? 0));
    if (amount > 0) items = addItem(items, materialId, amount);
  }
  return items;
}

/**
 * 保存データの itemInventory を正規化する。
 * 新フィールドが無い旧データでは旧 Inventory から補完する。
 * 通貨は既存 Inventory を正として硬貨所持数を揃える。
 */
export function normalizeItemInventoryWithLegacy(
  rawItems: unknown,
  legacy: Inventory,
): ItemInventory {
  const hasItems = rawItems !== undefined && rawItems !== null;
  const items = hasItems
    ? normalizeItemInventory(rawItems)
    : itemInventoryFromLegacy(legacy);

  const currency = Math.max(0, Math.floor(legacy.currency));
  if (currency > 0) items[COIN_ITEM_ID] = currency;
  else delete items[COIN_ITEM_ID];
  return items;
}

/** 新しいアイテム所持数から旧 Inventory の通貨・素材を同期する */
export function legacyInventoryFromItems(
  items: ItemInventory,
  fallback: Inventory,
): Inventory {
  const materials = { ...fallback.materials };
  for (const materialId of LEGACY_MATERIAL_ITEM_IDS) {
    materials[materialId] = getItemQuantity(items, materialId);
  }
  return {
    currency: getItemQuantity(items, COIN_ITEM_ID),
    materials,
  };
}
