/** タスク完了報酬・AI判定の型定義 */

import type { CrystalType, ItemRarity, ItemStack } from './inventory';

/** AI が判定するタスク難易度 */
export type TaskDifficulty = 1 | 2 | 3 | 4 | 5;

/** AI（またはフォールバック）によるタスク分析結果 */
export interface AIRewardEvaluation {
  /** 結晶の種類。定義済みの識別子のみ */
  materialType: CrystalType;
  difficulty: TaskDifficulty;
  confidence: number;
  reason: string;
  /** ai = モデル推論、fallback = カテゴリ・キーワードによる代替判定 */
  source: 'ai' | 'fallback';
}

/** AI へ渡すタスク情報 */
export interface TaskAnalysisInput {
  taskId: string;
  title: string;
  description: string;
  category: string;
  subject?: string;
  estimatedMinutes: number;
  actualMinutes: number;
}

/** 抽選結果の保存用スナップショット */
export interface TaskRewardRoll {
  /** 結晶ドロップ判定に使った乱数（0..1） */
  crystalRoll: number;
  /** 素材ドロップ判定に使った乱数（0..1） */
  materialRoll: number;
  /** レアリティ抽選に使った乱数（0..1） */
  rarityRoll: number;
  /** キャラクター素材の選択に使った乱数（0..1） */
  materialSelectRoll: number;
  crystalDropped: boolean;
  materialDropped: boolean;
  rarity: ItemRarity | null;
  crystalType: CrystalType | null;
  targetCharacterId: string | null;
}

/** タスク完了時に確定したゲーム報酬 */
export interface TaskCompletionReward {
  id: string;
  taskId: string;
  workSessionId: string;
  /** 既存の RewardRecord との紐付け */
  rewardRecordId: string;
  coins: number;
  stardust: number;
  crystals: ItemStack[];
  materials: ItemStack[];
  aiEvaluation: AIRewardEvaluation;
  roll: TaskRewardRoll;
  createdAt: string;
}
