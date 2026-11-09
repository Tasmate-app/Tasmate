import type { CrystalType, ItemStack } from '@tasmate/types';
import { crystalItemId, crystalItemIdsByRarity, CHARACTER_MATERIAL_IDS } from '../inventory/itemDefinitions';
import { TASK_REWARD_CONFIG } from './rewardConfig';

export interface DropDecision {
  dropped: boolean;
  item: ItemStack | null;
}

/** ドロップ判定。乱数は保存して再現できるようにする */
export function decideDrop(roll: number, dropRate: number): boolean {
  const safeRoll = Math.max(0, Math.min(1, Number.isFinite(roll) ? roll : 1));
  return safeRoll < dropRate;
}

export function pickCrystalStack(
  type: CrystalType,
  rarity: Parameters<typeof crystalItemIdsByRarity>[0],
): ItemStack {
  return {
    itemId: crystalItemId(type, rarity),
    quantity: TASK_REWARD_CONFIG.maxCrystalsPerTask,
  };
}

/**
 * キャラクター専用素材を1種類選ぶ。
 * 未定義キャラクター・素材なしの場合はドロップさせない（誤付与を防ぐ）。
 */
export function pickCharacterMaterialStack(
  characterId: string | null,
  roll: number,
): ItemStack | null {
  if (characterId === null) return null;
  const candidates = CHARACTER_MATERIAL_IDS[characterId];
  if (candidates === undefined || candidates.length === 0) return null;
  const index = Math.min(
    candidates.length - 1,
    Math.max(0, Math.floor(Math.max(0, Math.min(0.999999, roll)) * candidates.length)),
  );
  return { itemId: candidates[index], quantity: 1 };
}
