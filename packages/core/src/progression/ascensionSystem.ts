import type {
  AscensionRequirement,
  AscensionStage,
  ItemInventory,
  ItemStack,
  OwnedCharacter,
} from '@tasmate/types';
import { COIN_ITEM_ID, consumeItems } from '../inventory/inventoryManager';
import { crystalItemIdsByRarity } from '../inventory/itemDefinitions';
import {
  MAX_ASCENSION_STAGE,
  ascensionConfigForNextStage,
  characterMaterialId,
  normalizeAscensionStage,
} from './progressionConfig';
import { maxLevelForStage } from './levelSystem';

export interface AscensionPlan {
  currentStage: AscensionStage;
  nextStage: AscensionStage | null;
  currentMaxLevel: number;
  nextMaxLevel: number | null;
  requirement: AscensionRequirement | null;
  items: ItemStack[];
  canAscend: boolean;
}

/** 指定レアリティの結晶を任意種類から必要数集める */
function crystalCandidates(
  rarity: AscensionRequirement['crystals']['rarity'],
): Array<ItemStack & { order: number }> {
  return crystalItemIdsByRarity(rarity).map((itemId, order) => ({ itemId, quantity: 0, order }));
}

export function ascensionRequirement(
  characterId: string,
  currentStage: AscensionStage,
): AscensionRequirement | null {
  const config = ascensionConfigForNextStage(currentStage);
  if (config === null) return null;
  const materialId = characterMaterialId(characterId, config.materialIndex);
  if (materialId === null) return null;
  return {
    stage: config.stage,
    fromMaxLevel: maxLevelForStage(currentStage),
    toMaxLevel: maxLevelForStage(config.stage),
    crystals: { rarity: config.crystalRarity, quantity: config.crystalQuantity },
    characterMaterial: { itemId: materialId, quantity: config.materialQuantity },
    coins: config.coins,
  };
}

/**
 * 結晶は「同レアリティの任意種類」を合算して必要数を満たす。
 * 実際に消費するのは所持数の多い順（同数なら定義順）から。
 */
export function ascensionItems(
  requirement: AscensionRequirement,
  inventory: ItemInventory,
): ItemStack[] {
  const candidates = crystalCandidates(requirement.crystals.rarity)
    .map((stack) => ({
      ...stack,
      quantity: Math.max(0, Math.floor(inventory[stack.itemId] ?? 0)),
    }))
    .sort((a, b) => b.quantity - a.quantity || a.order - b.order);

  let remaining = requirement.crystals.quantity;
  const crystals: ItemStack[] = [];
  for (const candidate of candidates) {
    if (remaining <= 0) break;
    if (candidate.quantity <= 0) continue;
    const use = Math.min(candidate.quantity, remaining);
    crystals.push({ itemId: candidate.itemId, quantity: use });
    remaining -= use;
  }
  if (remaining > 0) {
    // 不足分は代表IDにまとめて不足として扱う
    crystals.push({
      itemId: candidates[0]?.itemId ?? '',
      quantity: remaining,
    });
  }

  return [
    ...crystals,
    { itemId: requirement.characterMaterial.itemId, quantity: requirement.characterMaterial.quantity },
    { itemId: COIN_ITEM_ID, quantity: requirement.coins },
  ];
}

export function planAscension(
  character: OwnedCharacter,
  inventory: ItemInventory,
): AscensionPlan {
  const currentStage = normalizeAscensionStage(character.ascensionStage);
  const requirement = ascensionRequirement(character.definitionId, currentStage);
  const currentMaxLevel = maxLevelForStage(currentStage);

  if (requirement === null || currentStage >= MAX_ASCENSION_STAGE) {
    return {
      currentStage,
      nextStage: null,
      currentMaxLevel,
      nextMaxLevel: null,
      requirement: null,
      items: [],
      canAscend: false,
    };
  }

  const items = ascensionItems(requirement, inventory);
  const atMaxLevel = character.level >= currentMaxLevel;
  const consumed = consumeItems(inventory, items);
  return {
    currentStage,
    nextStage: requirement.stage,
    currentMaxLevel,
    nextMaxLevel: requirement.toMaxLevel,
    requirement,
    items,
    canAscend: atMaxLevel && consumed.ok,
  };
}
