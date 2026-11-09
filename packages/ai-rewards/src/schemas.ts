import type { AIRewardEvaluation, CrystalType, TaskDifficulty } from '@tasmate/types';

export const CRYSTAL_TYPE_VALUES: readonly CrystalType[] = [
  'knowledge_crystal',
  'thought_crystal',
  'creation_crystal',
  'exploration_crystal',
  'effort_crystal',
];

export const TASK_DIFFICULTY_VALUES: readonly TaskDifficulty[] = [1, 2, 3, 4, 5];

export function isCrystalType(value: unknown): value is CrystalType {
  return typeof value === 'string' && CRYSTAL_TYPE_VALUES.includes(value as CrystalType);
}

export function isTaskDifficulty(value: unknown): value is TaskDifficulty {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * モデル出力を実行時検証する。
 * 不正な値・未知の種類・範囲外の難易度は null とし、呼び出し側でフォールバックする。
 */
export function parseTaskAnalysis(value: unknown): AIRewardEvaluation | null {
  if (!isRecord(value)) return null;
  const materialType = value['materialType'];
  const difficulty = value['difficulty'];
  if (!isCrystalType(materialType) || !isTaskDifficulty(difficulty)) return null;

  const confidenceValue = value['confidence'];
  const confidence =
    typeof confidenceValue === 'number' && Number.isFinite(confidenceValue)
      ? Math.max(0, Math.min(1, confidenceValue))
      : 0.5;
  const reason = typeof value['reason'] === 'string' ? value['reason'].slice(0, 300) : '';

  return {
    materialType,
    difficulty,
    confidence,
    reason,
    source: 'ai',
  };
}
