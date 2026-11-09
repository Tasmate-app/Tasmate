import type { TaskDifficulty } from '@tasmate/types';

/** タスク完了報酬の抽選・変換設定 */
export const TASK_REWARD_CONFIG = {
  /** 星屑1個あたりの実作業時間（分） */
  stardustMinutesPerUnit: 10,
  /** 結晶の基本ドロップ率（1タスク1回） */
  crystalDropRate: 0.3,
  /** キャラクター専用素材の基本ドロップ率（1タスク1回） */
  materialDropRate: 0.4,
  /** 中断時の星屑・ドロップ係数。0にはしない */
  interruptedDropFactor: 0.5,
  /** 1回の報酬で付与する結晶の最大数 */
  maxCrystalsPerTask: 1,
  /** 1回の報酬で付与する素材の最大数 */
  maxMaterialsPerTask: 1,
} as const;

export type { TaskDifficulty };
