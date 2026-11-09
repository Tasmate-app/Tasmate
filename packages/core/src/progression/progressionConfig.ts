import type { AscensionStage, ItemRarity } from '@tasmate/types';
import { CHARACTER_MATERIAL_IDS } from '../inventory/itemDefinitions';

/** レベル上限解放の段階ごとの最大レベル */
export const MAX_LEVEL_BY_ASCENSION_STAGE: Record<AscensionStage, number> = {
  0: 20,
  1: 30,
  2: 40,
  3: 50,
  4: 60,
  5: 70,
};

export const MAX_ASCENSION_STAGE: AscensionStage = 5;

/** 通常レベルアップで消費する星屑。レベルが上がるほど増える */
export function stardustCostForLevelUp(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  return Math.max(1, Math.ceil(lv / 2));
}

export interface AscensionConfig {
  stage: Exclude<AscensionStage, 0>;
  crystalRarity: ItemRarity;
  crystalQuantity: number;
  /** キャラクター専用素材の何番目を使うか */
  materialIndex: 0 | 1;
  materialQuantity: number;
  coins: number;
}

/** 上限解放の必要素材。段階が上がるほど重くなる */
export const ASCENSION_CONFIGS: readonly AscensionConfig[] = [
  { stage: 1, crystalRarity: 'N', crystalQuantity: 3, materialIndex: 0, materialQuantity: 3, coins: 200 },
  { stage: 2, crystalRarity: 'R', crystalQuantity: 3, materialIndex: 1, materialQuantity: 5, coins: 400 },
  { stage: 3, crystalRarity: 'R', crystalQuantity: 5, materialIndex: 0, materialQuantity: 8, coins: 700 },
  { stage: 4, crystalRarity: 'SR', crystalQuantity: 5, materialIndex: 1, materialQuantity: 12, coins: 1100 },
  { stage: 5, crystalRarity: 'SR', crystalQuantity: 8, materialIndex: 0, materialQuantity: 18, coins: 1600 },
];

export function ascensionConfigForNextStage(
  currentStage: AscensionStage,
): AscensionConfig | null {
  const nextStage = normalizeAscensionStage(currentStage) + 1;
  return ASCENSION_CONFIGS.find((config) => config.stage === nextStage) ?? null;
}

/** キャラクター専用素材ID。未定義キャラクターは素材なし */
export function characterMaterialId(
  characterId: string,
  materialIndex: 0 | 1,
): string | null {
  const ids = CHARACTER_MATERIAL_IDS[characterId];
  if (ids === undefined) return null;
  return ids[materialIndex] ?? null;
}

export function normalizeAscensionStage(value: unknown): AscensionStage {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  const stage = Math.max(0, Math.min(MAX_ASCENSION_STAGE, Math.floor(value)));
  return stage as AscensionStage;
}
