import type {
  Inventory,
  MaterialId,
  OwnedCharacter,
  OwnedFacility,
  RecurrenceRule,
  RewardRecord,
  Task,
  WeeklyEvaluation,
  WeeklyEvaluationStatus,
  WeeklyProgress,
  WorkSession,
  WorkSessionState,
} from '../types/index';
import {
  emptyWeeklyProgress,
  isValidDateKey,
  taskScheduledDateKey,
} from '../domain/weekly';

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
  };
}

type UnknownRecord = Record<string, unknown>;

const MATERIAL_IDS: readonly MaterialId[] = ['shard_sun', 'shard_moon', 'shard_star'];
const TASK_STATUSES = new Set(['planned', 'active', 'completed', 'cancelled']);
const SESSION_STATES = new Set<WorkSessionState>(['idle', 'running', 'paused']);
const SESSION_RESULTS = new Set(['completed', 'interrupted']);
const WEEKLY_STATUSES = new Set<WeeklyEvaluationStatus>([
  'achieved',
  'missed',
  'pending',
  'rest',
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toFiniteNonNegative(value: unknown): number {
  return isFiniteNumber(value) ? Math.max(0, Math.floor(value)) : 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function normalizeInventory(value: unknown): Inventory {
  const source = isRecord(value) ? value : {};
  const rawMaterials = isRecord(source['materials']) ? source['materials'] : {};
  const materials = {} as Record<MaterialId, number>;
  for (const id of MATERIAL_IDS) {
    materials[id] = toFiniteNonNegative(rawMaterials[id]);
  }
  return {
    currency: toFiniteNonNegative(source['currency']),
    materials,
  };
}

function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['title'] === 'string' &&
    typeof value['description'] === 'string' &&
    typeof value['category'] === 'string' &&
    isFiniteNumber(value['estimatedMinutes']) &&
    typeof value['status'] === 'string' &&
    TASK_STATUSES.has(value['status']) &&
    typeof value['createdAt'] === 'string' &&
    typeof value['updatedAt'] === 'string'
  );
}

function isWorkSession(value: unknown): value is WorkSession {
  if (!isRecord(value)) return false;
  if (
    typeof value['id'] !== 'string' ||
    typeof value['taskId'] !== 'string' ||
    typeof value['startedAt'] !== 'string' ||
    !isFiniteNumber(value['accumulatedSeconds']) ||
    typeof value['state'] !== 'string' ||
    !SESSION_STATES.has(value['state'] as WorkSessionState) ||
    typeof value['destinationId'] !== 'string' ||
    !isStringArray(value['assignedCharacterIds'])
  ) {
    return false;
  }
  if (
    value['result'] !== undefined &&
    (typeof value['result'] !== 'string' ||
      !SESSION_RESULTS.has(value['result'] as string))
  ) {
    return false;
  }
  return true;
}

function isOwnedCharacter(value: unknown): value is OwnedCharacter {
  return (
    isRecord(value) &&
    typeof value['definitionId'] === 'string' &&
    isFiniteNumber(value['level']) &&
    isFiniteNumber(value['experience'])
  );
}

function isOwnedFacility(value: unknown): value is OwnedFacility {
  return (
    isRecord(value) &&
    typeof value['definitionId'] === 'string' &&
    isFiniteNumber(value['level']) &&
    typeof value['enabled'] === 'boolean'
  );
}

function isRewardBundle(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isFiniteNumber(value['currency']) &&
    isFiniteNumber(value['experience']) &&
    isRecord(value['materials'])
  );
}

function isRewardRecord(value: unknown): value is RewardRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['workSessionId'] === 'string' &&
    typeof value['inputSummary'] === 'string' &&
    isRewardBundle(value['proposedReward']) &&
    isRewardBundle(value['finalReward']) &&
    typeof value['reason'] === 'string' &&
    typeof value['createdAt'] === 'string' &&
    (value['status'] === 'pending' ||
      value['status'] === 'approved' ||
      value['status'] === 'rejected')
  );
}

function isRecurrenceRule(value: unknown): value is RecurrenceRule {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['title'] === 'string' &&
    typeof value['description'] === 'string' &&
    typeof value['category'] === 'string' &&
    isFiniteNumber(value['estimatedMinutes']) &&
    value['frequency'] === 'weekly' &&
    Array.isArray(value['daysOfWeek']) &&
    value['daysOfWeek'].every(
      (day) => Number.isInteger(day) && (day as number) >= 1 && (day as number) <= 7,
    ) &&
    typeof value['effectiveFrom'] === 'string' &&
    isValidDateKey(value['effectiveFrom']) &&
    typeof value['isActive'] === 'boolean' &&
    typeof value['createdAt'] === 'string' &&
    typeof value['updatedAt'] === 'string'
  );
}

function isWeeklyEvaluation(value: unknown): value is WeeklyEvaluation {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['userId'] === 'string' &&
    typeof value['weekStart'] === 'string' &&
    isValidDateKey(value['weekStart']) &&
    typeof value['status'] === 'string' &&
    WEEKLY_STATUSES.has(value['status'] as WeeklyEvaluationStatus) &&
    isFiniteNumber(value['eligibleTaskCount']) &&
    isFiniteNumber(value['completedTaskCount']) &&
    typeof value['evaluatedAt'] === 'string' &&
    isStringArray(value['taskIds'])
  );
}

/** 保存データの簡易検証（破損データから起動不能になるのを防ぐ） */
export function isValidAppState(value: unknown): value is AppState {
  if (!isRecord(value)) return false;
  if (value['version'] !== 1) return false;
  if (
    !Array.isArray(value['tasks']) ||
    !Array.isArray(value['sessionHistory']) ||
    !Array.isArray(value['characters']) ||
    !Array.isArray(value['facilities']) ||
    !Array.isArray(value['rewards']) ||
    !Array.isArray(value['appliedRewardSessionIds'])
  ) {
    return false;
  }

  if (!isRecord(value['inventory'])) return false;
  const inventory = value['inventory'];
  if (inventory['currency'] !== undefined && !isFiniteNumber(inventory['currency'])) {
    return false;
  }
  if (inventory['materials'] !== undefined) {
    if (!isRecord(inventory['materials'])) return false;
    const materials = inventory['materials'];
    for (const id of MATERIAL_IDS) {
      if (materials[id] !== undefined && !isFiniteNumber(materials[id])) return false;
    }
  }

  if (
    value['activeSession'] !== undefined &&
    value['activeSession'] !== null &&
    !isWorkSession(value['activeSession'])
  ) {
    return false;
  }

  if (
    value['weeklyProgress'] !== undefined &&
    !isRecord(value['weeklyProgress'])
  ) {
    return false;
  }

  if (
    value['recurrenceRules'] !== undefined &&
    !Array.isArray(value['recurrenceRules'])
  ) {
    return false;
  }
  if (
    value['weeklyEvaluations'] !== undefined &&
    !Array.isArray(value['weeklyEvaluations'])
  ) {
    return false;
  }
  if (value['restWeeks'] !== undefined && !Array.isArray(value['restWeeks'])) {
    return false;
  }

  return true;
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

/**
 * 旧バージョンの保存データに週間機能の初期値を補完する。
 * 既存のタスク・報酬・セッションは変更しない。
 */
export function normalizeAppState(state: AppState, now: Date = new Date()): AppState {
  const source = state as unknown as UnknownRecord;
  const tasks = (Array.isArray(source['tasks']) ? source['tasks'] : [])
    .filter(isTask)
    .map(normalizeTask);
  const sessionHistory = (Array.isArray(source['sessionHistory'])
    ? source['sessionHistory']
    : []
  ).filter(isWorkSession);
  const rawActiveSession = source['activeSession'];
  const activeSession =
    rawActiveSession !== undefined && rawActiveSession !== null && isWorkSession(rawActiveSession)
      ? rawActiveSession
      : null;
  const characters = (Array.isArray(source['characters']) ? source['characters'] : []).filter(
    isOwnedCharacter,
  );
  const facilities = (Array.isArray(source['facilities']) ? source['facilities'] : []).filter(
    isOwnedFacility,
  );
  const rewards = (Array.isArray(source['rewards']) ? source['rewards'] : [])
    .filter(isRewardRecord)
    .map(normalizeReward);
  const appliedRewardSessionIds = isStringArray(source['appliedRewardSessionIds'])
    ? Array.from(new Set(source['appliedRewardSessionIds']))
    : [];
  const recurrenceRules = (
    Array.isArray(source['recurrenceRules']) ? source['recurrenceRules'] : []
  ).filter(isRecurrenceRule);
  const weeklyEvaluations = (
    Array.isArray(source['weeklyEvaluations']) ? source['weeklyEvaluations'] : []
  ).filter(isWeeklyEvaluation);
  const restWeeks = Array.from(
    new Set(
      (Array.isArray(source['restWeeks']) ? source['restWeeks'] : []).filter(
        (week): week is string => typeof week === 'string' && isValidDateKey(week),
      ),
    ),
  ).sort();

  const savedProgress = source['weeklyProgress'];
  const hasProgress =
    isRecord(savedProgress) &&
    typeof savedProgress['currentStreak'] === 'number' &&
    typeof savedProgress['totalSuccessfulWeeks'] === 'number' &&
    typeof savedProgress['highestStreak'] === 'number';
  let weeklyProgress: WeeklyProgress = hasProgress
    ? { ...(savedProgress as unknown as WeeklyProgress) }
    : emptyWeeklyProgress(now);

  if (!isValidDateKey(weeklyProgress.trackingStartedWeek)) {
    weeklyProgress = {
      ...weeklyProgress,
      trackingStartedWeek: emptyWeeklyProgress(now).trackingStartedWeek,
    };
  }
  if (
    weeklyProgress.lastEvaluatedWeekStart !== null &&
    (typeof weeklyProgress.lastEvaluatedWeekStart !== 'string' ||
      !isValidDateKey(weeklyProgress.lastEvaluatedWeekStart))
  ) {
    weeklyProgress = { ...weeklyProgress, lastEvaluatedWeekStart: null };
  }
  weeklyProgress = {
    ...weeklyProgress,
    userId:
      typeof weeklyProgress.userId === 'string' ? weeklyProgress.userId : 'local-user',
    currentStreak: toFiniteNonNegative(weeklyProgress.currentStreak),
    totalSuccessfulWeeks: toFiniteNonNegative(weeklyProgress.totalSuccessfulWeeks),
    highestStreak: toFiniteNonNegative(weeklyProgress.highestStreak),
    updatedAt:
      typeof weeklyProgress.updatedAt === 'string'
        ? weeklyProgress.updatedAt
        : now.toISOString(),
  };

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
    version: 1,
    tasks,
    activeSession,
    sessionHistory,
    inventory: normalizeInventory(source['inventory']),
    characters,
    facilities,
    rewards,
    appliedRewardSessionIds,
    recurrenceRules,
    weeklyEvaluations,
    weeklyProgress,
    restWeeks,
  };
}
