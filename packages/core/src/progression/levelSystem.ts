import type { AscensionStage, ItemInventory, ItemStack, OwnedCharacter } from '@tasmate/types';
import { experienceToNextLevel, levelUpCost } from '../reward';
import { COIN_ITEM_ID, STARDUST_ITEM_ID, consumeItems } from '../inventory/inventoryManager';
import { MAX_LEVEL_BY_ASCENSION_STAGE, normalizeAscensionStage, stardustCostForLevelUp } from './progressionConfig';

export interface LevelUpPlan {
  level: number;
  maxLevel: number;
  nextLevel: number;
  experience: number;
  requiredExperience: number;
  items: ItemStack[];
  canLevelUp: boolean;
}

export function maxLevelForStage(stage: AscensionStage): number {
  return MAX_LEVEL_BY_ASCENSION_STAGE[normalizeAscensionStage(stage)];
}

export function levelUpItems(level: number): ItemStack[] {
  return [
    { itemId: COIN_ITEM_ID, quantity: levelUpCost(level) },
    { itemId: STARDUST_ITEM_ID, quantity: stardustCostForLevelUp(level) },
  ];
}

export function planLevelUp(
  character: OwnedCharacter,
  inventory: ItemInventory,
): LevelUpPlan {
  const level = Math.max(1, Math.floor(character.level));
  const stage = normalizeAscensionStage(character.ascensionStage);
  const maxLevel = maxLevelForStage(stage);
  const requiredExperience = experienceToNextLevel(level);
  const items = levelUpItems(level);
  const atMaxLevel = level >= maxLevel;
  const hasExperience = character.experience >= requiredExperience;
  const consumed = consumeItems(inventory, atMaxLevel ? [] : items);
  return {
    level,
    maxLevel,
    nextLevel: Math.min(level + 1, maxLevel),
    experience: character.experience,
    requiredExperience,
    items,
    canLevelUp: !atMaxLevel && hasExperience && consumed.ok,
  };
}
