/** タスク完了報酬・タスク評価の型定義 */

import type { CrystalType, ItemRarity, ItemStack } from './inventory';

/** タスク評価で決まる難易度 */
export type TaskDifficulty = 1 | 2 | 3 | 4 | 5;

/** タスク評価の結果 */
export interface TaskEvaluation {
  /** 結晶の種類。定義済みの識別子のみ */
  materialType: CrystalType;
  difficulty: TaskDifficulty;
  confidence: number;
  reason: string;
  /** 現状は keyword のみ。旧データ互換のため型は維持する */
  source: 'ai' | 'keyword' | 'fallback';
}

/** キーワード評価に渡すタスク情報 */
export interface TaskEvaluationInput {
  taskId: string;
  title: string;
  description: string;
  category: string;
  subject?: string;
  estimatedMinutes: number;
  actualMinutes: number;
  /** カテゴリーに設定されたユーザー定義キーワード */
  categoryKeywords?: readonly string[];
  /** カテゴリーに設定された既定の結晶タイプ。未設定時は名前から推定する */
  categoryDefaultType?: CrystalType;
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
  /** フィールド名は既存保存データとの互換のため維持する */
  aiEvaluation: TaskEvaluation;
  roll: TaskRewardRoll;
  createdAt: string;
}
