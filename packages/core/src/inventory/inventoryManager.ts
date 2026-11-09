import type { ItemInventory, ItemStack, ItemTransaction, ItemTransactionReason } from '@tasmate/types';
import { getItemDefinition, isKnownItem, ITEM_DEFINITIONS, ITEM_RARITY_ORDER } from './itemDefinitions';

export const COIN_ITEM_ID = 'coin';
export const STARDUST_ITEM_ID = 'stardust';

export interface ConsumeResultSuccess {
  ok: true;
  inventory: ItemInventory;
  consumed: ItemStack[];
}

export interface ConsumeResultFailure {
  ok: false;
  /** 不足しているアイテム。required は要求数、owned は所持数 */
  missing: Array<{ itemId: string; required: number; owned: number }>;
  /** 定義に存在しないアイテム */
  unknownItemIds: string[];
}

export type ConsumeResult = ConsumeResultSuccess | ConsumeResultFailure;

function safeQuantity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/** 保存データの所持数を検証・正規化する。未知IDは保持する（将来の追加に備える） */
export function normalizeItemInventory(
  value: unknown,
  knownOnly = false,
): ItemInventory {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const result: ItemInventory = {};
  for (const [itemId, quantity] of Object.entries(value as Record<string, unknown>)) {
    if (knownOnly && !isKnownItem(itemId)) continue;
    const safe = safeQuantity(quantity);
    if (safe > 0) result[itemId] = safe;
  }
  return result;
}

export function getItemQuantity(inventory: ItemInventory, itemId: string): number {
  return safeQuantity(inventory[itemId]);
}

export function hasItem(inventory: ItemInventory, itemId: string, quantity = 1): boolean {
  return getItemQuantity(inventory, itemId) >= safeQuantity(quantity);
}

/** 1種類のアイテムを加算した新しいインベントリを返す */
export function addItem(inventory: ItemInventory, itemId: string, quantity: number): ItemInventory {
  const amount = safeQuantity(quantity);
  if (amount <= 0) return inventory;
  return {
    ...inventory,
    [itemId]: getItemQuantity(inventory, itemId) + amount,
  };
}

/** 複数スタックを加算する。同じアイテムは合算する */
export function addItems(inventory: ItemInventory, stacks: readonly ItemStack[]): ItemInventory {
  let result = inventory;
  for (const stack of stacks) {
    result = addItem(result, stack.itemId, stack.quantity);
  }
  return result;
}

/**
 * 複数スタックをまとめて消費する。
 * 1つでも不足・未知IDがあればインベントリを変更せず失敗する（途中消費を防ぐ）。
 */
export function consumeItems(
  inventory: ItemInventory,
  stacks: readonly ItemStack[],
): ConsumeResult {
  const required = new Map<string, number>();
  for (const stack of stacks) {
    const amount = safeQuantity(stack.quantity);
    if (amount <= 0) continue;
    required.set(stack.itemId, (required.get(stack.itemId) ?? 0) + amount);
  }

  const missing: ConsumeResultFailure['missing'] = [];
  const unknownItemIds: string[] = [];
  for (const [itemId, amount] of required) {
    if (!isKnownItem(itemId)) {
      unknownItemIds.push(itemId);
      continue;
    }
    const owned = getItemQuantity(inventory, itemId);
    if (owned < amount) missing.push({ itemId, required: amount, owned });
  }
  if (missing.length > 0 || unknownItemIds.length > 0) {
    return { ok: false, missing, unknownItemIds };
  }

  const next: ItemInventory = { ...inventory };
  const consumed: ItemStack[] = [];
  for (const [itemId, amount] of required) {
    const remaining = getItemQuantity(next, itemId) - amount;
    if (remaining > 0) next[itemId] = remaining;
    else delete next[itemId];
    consumed.push({ itemId, quantity: amount });
  }
  return { ok: true, inventory: next, consumed };
}

/** カテゴリ別に所持アイテムを並べる。数量0は含めない */
export function listOwnedItems(
  inventory: ItemInventory,
  category?: string,
): Array<{ itemId: string; quantity: number }> {
  return Object.entries(inventory)
    .filter(([, quantity]) => safeQuantity(quantity) > 0)
    .filter(([itemId]) => {
      const definition = getItemDefinition(itemId);
      if (definition === undefined) return category === undefined;
      return category === undefined || definition.category === category;
    })
    .map(([itemId, quantity]) => ({ itemId, quantity: safeQuantity(quantity) }))
    .sort((a, b) => {
      const defA = getItemDefinition(a.itemId);
      const defB = getItemDefinition(b.itemId);
      const orderA = defA?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = defB?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.itemId.localeCompare(b.itemId);
    });
}

/** アイテムIDをレアリティ順（低→高）で並べる */
export function sortItemIdsByRarity(itemIds: readonly string[]): string[] {
  return [...itemIds].sort((a, b) => {
    const defA = getItemDefinition(a);
    const defB = getItemDefinition(b);
    const rarityA = defA === undefined ? -1 : ITEM_RARITY_ORDER[defA.rarity];
    const rarityB = defB === undefined ? -1 : ITEM_RARITY_ORDER[defB.rarity];
    if (rarityA !== rarityB) return rarityA - rarityB;
    return (defA?.sortOrder ?? 0) - (defB?.sortOrder ?? 0);
  });
}

export function createItemTransaction(args: {
  id: string;
  itemId: string;
  delta: number;
  reason: ItemTransactionReason;
  createdAt: string;
  taskId?: string;
  characterId?: string;
}): ItemTransaction {
  return {
    id: args.id,
    itemId: args.itemId,
    delta: Math.trunc(args.delta),
    reason: args.reason,
    createdAt: args.createdAt,
    taskId: args.taskId,
    characterId: args.characterId,
  };
}

/** 全アイテム定義のID。検証用 */
export const ALL_ITEM_IDS: readonly string[] = ITEM_DEFINITIONS.map((definition) => definition.id);
