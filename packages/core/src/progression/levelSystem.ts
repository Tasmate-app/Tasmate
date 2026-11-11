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

function safeLevel(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
}

function safeExperience(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/**
 * 経験値を加算し、上限レベルまで自動でレベルアップする。
 * レベルアップで必要な経験値だけを消費し、余剰は次のレベルへ持ち越す。
 * 上限レベルではレベルを上げず、経験値は保持する。
 */
export function applyExperienceToCharacter(
  character: OwnedCharacter,
  gainedExperience: number,
): OwnedCharacter {
  let level = safeLevel(character.level);
  let experience = safeExperience(character.experience) + safeExperience(gainedExperience);
  const maxLevel = maxLevelForStage(normalizeAscensionStage(character.ascensionStage));
  while (level < maxLevel) {
    const required = experienceToNextLevel(level);
    if (experience < required) break;
    experience -= required;
    level += 1;
  }
  if (level === character.level && experience === character.experience) return character;
  return { ...character, level, experience };
}

/**
 * 素材（硬貨・星屑）による手動レベルアップの計画。
 * 経験値は条件に含めない。経験値はタスク完了時の自動レベルアップで消費する。
 */
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
  const consumed = consumeItems(inventory, atMaxLevel ? [] : items);
  return {
    level,
    maxLevel,
    nextLevel: Math.min(level + 1, maxLevel),
    experience: character.experience,
    requiredExperience,
    items,
    canLevelUp: !atMaxLevel && consumed.ok,
  };
}
