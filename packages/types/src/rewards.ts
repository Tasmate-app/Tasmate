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
  /** ai = モデル推論、keyword = キーワード判定、fallback = 旧形式の代替判定 */
  source: 'ai' | 'keyword' | 'fallback';
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
  aiEvaluation: AIRewardEvaluation;
  roll: TaskRewardRoll;
  createdAt: string;
}
