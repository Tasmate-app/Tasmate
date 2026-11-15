import type {
  CrystalType,
  ItemInventory,
  ItemRarity,
  ItemStack,
  MaterialId,
} from '@tasmate/types';
import { COIN_ITEM_ID, consumeItems } from './inventoryManager';
import {
  CRYSTAL_TYPES,
  ITEM_RARITIES,
  crystalItemId,
} from './itemDefinitions';

/** 結晶タイプごとに合成で使うかけら */
export const CRYSTAL_SYNTHESIS_SHARDS: Record<CrystalType, MaterialId> = {
  knowledge_crystal: 'shard_moon',
  thought_crystal: 'shard_moon',
  creation_crystal: 'shard_sun',
  exploration_crystal: 'shard_star',
  effort_crystal: 'shard_sun',
};

/** レアリティごとの合成コスト */
export const CRYSTAL_SYNTHESIS_COSTS: Record<
  ItemRarity,
  { shardQuantity: number; coinQuantity: number }
> = {
  N: { shardQuantity: 5, coinQuantity: 100 },
  R: { shardQuantity: 15, coinQuantity: 300 },
  SR: { shardQuantity: 30, coinQuantity: 800 },
  SSR: { shardQuantity: 60, coinQuantity: 2000 },
  UR: { shardQuantity: 120, coinQuantity: 5000 },
};

export interface CrystalSynthesisRecipe {
  crystalType: CrystalType;
  crystalItemId: string;
  rarity: ItemRarity;
  shardItemId: MaterialId;
  shardQuantity: number;
  coinQuantity: number;
  /** 合成時にまとめて消費するスタック */
  items: ItemStack[];
}

export interface CrystalSynthesisPlan {
  recipe: CrystalSynthesisRecipe;
  canSynthesize: boolean;
  missing: Array<{ itemId: string; required: number; owned: number }>;
}

/** 指定した結晶タイプ・レアリティの合成レシピを返す */
export function crystalSynthesisRecipe(
  type: CrystalType,
  rarity: ItemRarity,
): CrystalSynthesisRecipe {
  const cost = CRYSTAL_SYNTHESIS_COSTS[rarity];
  const shardItemId = CRYSTAL_SYNTHESIS_SHARDS[type];
  return {
    crystalType: type,
    crystalItemId: crystalItemId(type, rarity),
    rarity,
    shardItemId,
    shardQuantity: cost.shardQuantity,
    coinQuantity: cost.coinQuantity,
    items: [
      { itemId: shardItemId, quantity: cost.shardQuantity },
      { itemId: COIN_ITEM_ID, quantity: cost.coinQuantity },
    ],
  };
}

/** 1つの結晶タイプについて、全レアリティのレシピを返す */
export function crystalSynthesisRecipes(type: CrystalType): CrystalSynthesisRecipe[] {
  return ITEM_RARITIES.map((rarity) => crystalSynthesisRecipe(type, rarity));
}

/** 現在の所持数で合成できるか、不足している素材を返す */
export function planCrystalSynthesis(
  type: CrystalType,
  rarity: ItemRarity,
  inventory: ItemInventory,
): CrystalSynthesisPlan {
  const recipe = crystalSynthesisRecipe(type, rarity);
  const result = consumeItems(inventory, recipe.items);
  if (result.ok) {
    return { recipe, canSynthesize: true, missing: [] };
  }
  return { recipe, canSynthesize: false, missing: result.missing };
}

/** 合成対象として選択できる結晶タイプ */
export const SYNTHESIZABLE_CRYSTAL_TYPES: readonly CrystalType[] = CRYSTAL_TYPES;
