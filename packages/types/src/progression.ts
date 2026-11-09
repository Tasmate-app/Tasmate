/** キャラクター育成（通常レベルアップ・レベル上限解放）の型定義 */

import type { ItemRarity } from './inventory';

/** 上限解放の段階。0 が初期状態、5 が最大 */
export type AscensionStage = 0 | 1 | 2 | 3 | 4 | 5;

/** 通常レベルアップに必要な素材 */
export interface LevelUpRequirement {
  level: number;
  experience: number;
  coins: number;
  stardust: number;
}

/** 上限解放に必要な素材 */
export interface AscensionRequirement {
  stage: AscensionStage;
  /** 解放前の最大レベル */
  fromMaxLevel: number;
  /** 解放後の最大レベル */
  toMaxLevel: number;
  crystals: {
    rarity: ItemRarity;
    quantity: number;
  };
  characterMaterial: {
    itemId: string;
    quantity: number;
  };
  coins: number;
}

/** 育成操作の結果 */
export type ProgressionResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'not_owned' | 'max_level' | 'max_ascension' | 'insufficient_experience' | 'insufficient_items';
      /** 不足しているアイテムと不足数 */
      missing?: Array<{ itemId: string; required: number; owned: number }>;
    };
