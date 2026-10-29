import type {
  Inventory,
  OwnedCharacter,
  OwnedFacility,
  RecurrenceRule,
  RestSession,
  RewardRecord,
  SupportEvent,
  Task,
  WeeklyEvaluation,
  WeeklyProgress,
  WorkSession,
} from '../types/index';
import { BALANCE } from '../domain/constants';
import { emptyWeeklyProgress, taskScheduledDateKey } from '../domain/weekly';

/**
 * 永続化されるアプリ全体の状態。
 * UI はこの状態へ直接触らず、必ず src/stores/ のアクション経由で更新する。
 * 保存の実体（localStorage）は src/services/storage.ts に隔離する。
 */
export interface AppState {
  version: 1;
  tasks: Task[];
  /** 進行中・一時停止中のセッション（同時に1件まで・仮仕様） */
  activeSession: WorkSession | null;
  sessionHistory: WorkSession[];
  inventory: Inventory;
  characters: OwnedCharacter[];
  facilities: OwnedFacility[];
  rewards: RewardRecord[];
  /** 報酬付与済みセッション ID（二重付与防止） */
  appliedRewardSessionIds: string[];
  /** 繰り返しタスクのルール */
  recurrenceRules: RecurrenceRule[];
  /** 週次判定の履歴（weekStart ごとに一意） */
  weeklyEvaluations: WeeklyEvaluation[];
  /** 週間継続状態 */
  weeklyProgress: WeeklyProgress;
  /** 休息週として設定した週の開始日 */
  restWeeks: string[];
  /** 進行中・完了した休憩（直近1件） */
  restSession: RestSession | null;
  /** キャラクターの応援・声かけイベント（新しい順） */
  supportEvents: SupportEvent[];
}

/** 初期状態（仮データ） */
export function initialAppState(): AppState {
  const now = new Date();
  return {
    version: 1,
    tasks: [],
    activeSession: null,
    sessionHistory: [],
    inventory: {
      currency: 100,
      materials: { shard_sun: 0, shard_moon: 0, shard_star: 0 },
    },
    characters: [
      { definitionId: 'c-hinata', level: 1, experience: 0 },
      { definitionId: 'c-luna', level: 1, experience: 0 },
    ],
    facilities: [
      { definitionId: 'f-coin', level: 1, enabled: true },
      { definitionId: 'f-star', level: 1, enabled: true },
    ],
    rewards: [],
    appliedRewardSessionIds: [],
    recurrenceRules: [],
    weeklyEvaluations: [],
    weeklyProgress: emptyWeeklyProgress(now),
    restWeeks: [],
    restSession: null,
    supportEvents: [],
  };
}

/** 保存データの簡易検証（破損データから起動不能になるのを防ぐ） */
export function isValidAppState(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v['version'] === 1 &&
    Array.isArray(v['tasks']) &&
    Array.isArray(v['sessionHistory']) &&
    typeof v['inventory'] === 'object' &&
    Array.isArray(v['characters']) &&
    Array.isArray(v['facilities']) &&
    Array.isArray(v['rewards']) &&
    Array.isArray(v['appliedRewardSessionIds'])
  );
}

function normalizeTask(task: Task): Task {
  if (task.scheduledDate !== undefined) return task;
  const dateKey = taskScheduledDateKey(task);
  return dateKey === undefined ? task : { ...task, scheduledDate: dateKey };
}

function normalizeReward(reward: RewardRecord): RewardRecord {
  return {
    ...reward,
    baseReward: reward.baseReward ?? reward.finalReward,
    rewardMultiplier: reward.rewardMultiplier ?? 1,
  };
}

function normalizeRestSession(value: unknown): RestSession | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v['id'] !== 'string' ||
    typeof v['startedAt'] !== 'string' ||
    typeof v['plannedMinutes'] !== 'number' ||
    (v['state'] !== 'active' && v['state'] !== 'completed')
  ) {
    return null;
  }
  return {
    id: v['id'],
    startedAt: v['startedAt'],
    plannedMinutes: v['plannedMinutes'],
    sourceSessionId: typeof v['sourceSessionId'] === 'string' ? v['sourceSessionId'] : undefined,
    state: v['state'],
    endedAt: typeof v['endedAt'] === 'string' ? v['endedAt'] : undefined,
  };
}

function normalizeSupportEvent(value: unknown): SupportEvent | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const kind = v['kind'];
  if (
    typeof v['id'] !== 'string' ||
    typeof v['characterId'] !== 'string' ||
    typeof v['message'] !== 'string' ||
    typeof v['createdAt'] !== 'string' ||
    (kind !== 'consecutive-work' && kind !== 'long-work' && kind !== 'rest-complete')
  ) {
    return null;
  }
  return {
    id: v['id'],
    kind,
    characterId: v['characterId'],
    message: v['message'],
    createdAt: v['createdAt'],
    workSessionId: typeof v['workSessionId'] === 'string' ? v['workSessionId'] : undefined,
    seen: v['seen'] === true,
  };
}

/**
 * 旧バージョンの保存データに週間機能・休息イベントの初期値を補完する。
 * 既存のタスク・報酬・セッションは変更しない。
 */
export function normalizeAppState(state: AppState, now: Date = new Date()): AppState {
  const candidate = state as AppState & {
    recurrenceRules?: RecurrenceRule[];
    weeklyEvaluations?: WeeklyEvaluation[];
    weeklyProgress?: WeeklyProgress;
    restWeeks?: string[];
    restSession?: unknown;
    supportEvents?: unknown[];
  };
  const tasks = state.tasks.map(normalizeTask);
  const rewards = state.rewards.map(normalizeReward);
  const recurrenceRules = Array.isArray(candidate.recurrenceRules)
    ? candidate.recurrenceRules
    : [];
  const weeklyEvaluations = Array.isArray(candidate.weeklyEvaluations)
    ? candidate.weeklyEvaluations
    : [];
  const restWeeks = Array.isArray(candidate.restWeeks)
    ? candidate.restWeeks.filter((week): week is string => typeof week === 'string')
    : [];
  const restSession = normalizeRestSession(candidate.restSession);
  const supportEvents = Array.isArray(candidate.supportEvents)
    ? candidate.supportEvents
        .map(normalizeSupportEvent)
        .filter((event): event is SupportEvent => event !== null)
        .slice(0, BALANCE.maxSupportEvents)
    : [];

  const savedProgress = candidate.weeklyProgress;
  let weeklyProgress =
    savedProgress !== undefined &&
    typeof savedProgress.currentStreak === 'number' &&
    typeof savedProgress.totalSuccessfulWeeks === 'number' &&
    typeof savedProgress.highestStreak === 'number'
      ? { ...savedProgress }
      : emptyWeeklyProgress(now);

  if (typeof weeklyProgress.trackingStartedWeek !== 'string') {
    weeklyProgress = { ...weeklyProgress, trackingStartedWeek: emptyWeeklyProgress(now).trackingStartedWeek };
  }

  const latestEvaluation = weeklyEvaluations.reduce<string | null>(
    (latest, evaluation) =>
      latest === null || evaluation.weekStart > latest ? evaluation.weekStart : latest,
    null,
  );
  if (
    latestEvaluation !== null &&
    (weeklyProgress.lastEvaluatedWeekStart === null ||
      latestEvaluation > weeklyProgress.lastEvaluatedWeekStart)
  ) {
    weeklyProgress = { ...weeklyProgress, lastEvaluatedWeekStart: latestEvaluation };
  }

  return {
    ...state,
    tasks,
    rewards,
    recurrenceRules,
    weeklyEvaluations,
    weeklyProgress,
    restWeeks,
    restSession,
    supportEvents,
  };
}
