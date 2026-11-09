import type {
  AIRewardEvaluation,
  ItemStack,
  Task,
  TaskAnalysisInput,
  TaskCompletionReward,
  TaskRewardRoll,
} from '@tasmate/types';
import { analyzeTaskFallback } from '@tasmate/ai-rewards';
import { pickRarity } from './dropRateTable';
import {
  decideDrop,
  pickCharacterMaterialStack,
  pickCrystalStack,
} from './dropTable';
import { TASK_REWARD_CONFIG } from './rewardConfig';

export interface BuildTaskAnalysisInputArgs {
  task: Task | undefined;
  actualMinutes: number;
}

export function buildTaskAnalysisInput({
  task,
  actualMinutes,
}: BuildTaskAnalysisInputArgs): TaskAnalysisInput {
  return {
    taskId: task?.id ?? 'unknown-task',
    title: task?.title ?? 'タスク',
    description: task?.description ?? '',
    category: task?.category ?? '',
    subject: task?.subject,
    estimatedMinutes: Math.max(1, Math.floor(task?.estimatedMinutes ?? actualMinutes)),
    actualMinutes: Math.max(0, actualMinutes),
  };
}

export interface RollTaskRewardArgs {
  taskId: string;
  workSessionId: string;
  rewardRecordId: string;
  task: Task | undefined;
  actualMinutes: number;
  coins: number;
  completed: boolean;
  evaluation: AIRewardEvaluation;
  targetCharacterId: string | null;
  previousStardustCarry: number;
  nowIso: string;
  /** 同一タスクで既に抽選済みの場合、結晶・素材を再抽選せず付与しない */
  suppressDrops?: boolean;
  /** テスト用。省略時は Math.random */
  random?: () => number;
}

export interface RollTaskRewardResult {
  reward: TaskCompletionReward;
  stardustCarry: number;
}

/**
 * タスク完了報酬を確定する。
 * - 星屑は実作業時間から算出し、端数を持ち越す
 * - 結晶・素材は独立抽選（同じタスクでは再抽選しない）
 * - レアリティは難易度別テーブルからプログラム側で決定
 */
export function rollTaskReward(args: RollTaskRewardArgs): RollTaskRewardResult {
  const random = args.random ?? Math.random;
  const factor = args.completed ? 1 : TASK_REWARD_CONFIG.interruptedDropFactor;

  const totalStardustMinutes =
    Math.max(0, Number.isFinite(args.previousStardustCarry) ? args.previousStardustCarry : 0) +
    Math.max(0, args.actualMinutes);
  const stardust = Math.floor(totalStardustMinutes / TASK_REWARD_CONFIG.stardustMinutesPerUnit);
  const stardustCarry =
    totalStardustMinutes - stardust * TASK_REWARD_CONFIG.stardustMinutesPerUnit;

  const crystalRoll = random();
  const materialRoll = random();
  const rarityRoll = random();
  const materialSelectRoll = random();

  const crystalDropped =
    args.suppressDrops !== true &&
    decideDrop(crystalRoll, TASK_REWARD_CONFIG.crystalDropRate * factor);
  const rarity = crystalDropped ? pickRarity(args.evaluation.difficulty, rarityRoll) : null;
  const crystals: ItemStack[] =
    crystalDropped && rarity !== null
      ? [pickCrystalStack(args.evaluation.materialType, rarity)]
      : [];

  const materialDropped =
    args.suppressDrops !== true &&
    decideDrop(materialRoll, TASK_REWARD_CONFIG.materialDropRate * factor);
  const materialStack = materialDropped
    ? pickCharacterMaterialStack(args.targetCharacterId, materialSelectRoll)
    : null;
  const materials: ItemStack[] = materialStack === null ? [] : [materialStack];

  const roll: TaskRewardRoll = {
    crystalRoll,
    materialRoll,
    rarityRoll,
    materialSelectRoll,
    crystalDropped,
    materialDropped,
    rarity,
    crystalType: crystalDropped ? args.evaluation.materialType : null,
    targetCharacterId: materialStack === null ? null : args.targetCharacterId,
  };

  return {
    reward: {
      id: `task-reward-${args.workSessionId}`,
      taskId: args.taskId,
      workSessionId: args.workSessionId,
      rewardRecordId: args.rewardRecordId,
      coins: Math.max(0, Math.floor(Number.isFinite(args.coins) ? args.coins : 0)),
      stardust,
      crystals,
      materials,
      aiEvaluation: args.evaluation,
      roll,
      createdAt: args.nowIso,
    },
    stardustCarry,
  };
}

/** 同期フォールバックで評価する。AIアダプター導入後も失敗時の共通経路として使う */
export function evaluateTaskWithFallback(args: BuildTaskAnalysisInputArgs): AIRewardEvaluation {
  return analyzeTaskFallback(buildTaskAnalysisInput(args));
}

export function hasTaskRewardForTask(
  rewards: readonly TaskCompletionReward[],
  taskId: string,
): boolean {
  return rewards.some((reward) => reward.taskId === taskId);
}
