import type {
  AppSettings,
  Category,
  Inventory,
  ItemInventory,
  ItemTransaction,
  InterruptedQuest,
  MaterialId,
  OwnedCharacter,
  OwnedFacility,
  RecurrenceRule,
  RestSession,
  RewardRecord,
  SubCategory,
  SupportEvent,
  Task,
  TaskCompletionReward,
  WeeklyEvaluation,
  WeeklyEvaluationStatus,
  WeeklyProgress,
  WorkSession,
  WorkSessionState,
} from '@tasmate/types';

import {
  emptyWeeklyProgress,
  isValidDateKey,
  taskScheduledDateKey,
} from './weekly';

import { BALANCE } from './constants';
import {
  createDefaultCategories,
  migrateCategorySystem,
  normalizeCategoryList,
  normalizeSubCategoryList,
} from './categories';
import { normalizeItemInventoryWithLegacy } from './inventory/materialStorage';
import { applyExperienceToCharacter } from './progression/levelSystem';
import { normalizeAscensionStage } from './progression/progressionConfig';
import { createDefaultNavigationItems, normalizeNavigationItems } from './navigation';

/**
 * 永続化されるアプリ全体の状態。
 * UI はこの状態へ直接触らず、必ずストアのアクション経由で更新する。
 * 保存の実体（localStorage / AsyncStorage）は StorageAdapter に隔離する。
 */
export interface AppState {
  version: 1;
  tasks: Task[];
  /** 進行中・一時停止中のセッション（同時に1件まで・仮仕様） */
  activeSession: WorkSession | null;
  sessionHistory: WorkSession[];
  /** 中断して保持しているクエスト（複数保持可能） */
  interruptedQuests: InterruptedQuest[];
  inventory: Inventory;
  /** 新しい共通インベントリ。既存 Inventory と通貨・旧素材を同期する */
  itemInventory: ItemInventory;
  /** アイテムの獲得・消費履歴（新しい順） */
  itemHistory: ItemTransaction[];
  /** タスク完了報酬の抽選結果（セッション・タスク単位で一意） */
  taskRewards: TaskCompletionReward[];
  /** 星屑の端数（分）。次回タスクへ持ち越す */
  stardustCarry: number;
  characters: OwnedCharacter[];
  facilities: OwnedFacility[];
  rewards: RewardRecord[];
  /** 報酬付与済みセッション ID（二重付与防止） */
  appliedRewardSessionIds: string[];
  /** 繰り返しタスクのルール */
  recurrenceRules: RecurrenceRule[];
  /** ユーザーが管理するカテゴリー（削除済みも履歴表示のため保持） */
  categories: Category[];
  /** カテゴリーに属するサブカテゴリー */
  subCategories: SubCategory[];
  /** 既定カテゴリーへの移行が完了したか。未移行データだけ一度だけ実行する */
  categorySystemInitialized: boolean;
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
  /** アプリ全体のユーザー設定 */
  settings: AppSettings;
}

/** 初期状態（仮データ） */
export function initialAppState(): AppState {
  const now = new Date();
  const { categories, subCategories } = createDefaultCategories(now.toISOString());
  return {
    version: 1,
    tasks: [],
    activeSession: null,
    sessionHistory: [],
    interruptedQuests: [],
    inventory: {
      currency: 100,
      materials: { shard_sun: 0, shard_moon: 0, shard_star: 0 },
    },
    itemInventory: { coin: 100 },
    itemHistory: [],
    taskRewards: [],
    stardustCarry: 0,
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
    categories,
    subCategories,
    categorySystemInitialized: true,
    weeklyEvaluations: [],
    weeklyProgress: emptyWeeklyProgress(now),
    restWeeks: [],
    restSession: null,
    supportEvents: [],
    settings: {
      lastBackupAt: null,
      tutorialCompletedAt: null,
      navigationItems: createDefaultNavigationItems(),
    },
  };
}

type UnknownRecord = Record<string, unknown>;

const MATERIAL_IDS: readonly MaterialId[] = ['shard_sun', 'shard_moon', 'shard_star'];
const TASK_STATUSES = new Set(['planned', 'active', 'interrupted', 'completed', 'cancelled']);
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

function normalizeOwnedCharacter(value: OwnedCharacter): OwnedCharacter {
  const normalized: OwnedCharacter = {
    ...value,
    ascensionStage: normalizeAscensionStage(value.ascensionStage),
  };
  // 旧仕様で未処理だった経験値を、読み込み時に自動レベルアップへ反映する
  return applyExperienceToCharacter(normalized, 0);
}

function isOwnedCharacter(value: unknown): value is OwnedCharacter {
  return (
    isRecord(value) &&
    typeof value['definitionId'] === 'string' &&
    isFiniteNumber(value['level']) &&
    isFiniteNumber(value['experience'])
  );
}

function isItemTransaction(value: unknown): value is ItemTransaction {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['itemId'] === 'string' &&
    isFiniteNumber(value['delta']) &&
    typeof value['reason'] === 'string' &&
    typeof value['createdAt'] === 'string'
  );
}

function isItemStackArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry['itemId'] === 'string' &&
        isFiniteNumber(entry['quantity']),
    )
  );
}

function isTaskCompletionReward(value: unknown): value is TaskCompletionReward {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['taskId'] === 'string' &&
    typeof value['workSessionId'] === 'string' &&
    typeof value['rewardRecordId'] === 'string' &&
    isFiniteNumber(value['coins']) &&
    isFiniteNumber(value['stardust']) &&
    isItemStackArray(value['crystals']) &&
    isItemStackArray(value['materials']) &&
    isRecord(value['aiEvaluation']) &&
    isRecord(value['roll']) &&
    typeof value['createdAt'] === 'string'
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
    value['interruptedQuests'] !== undefined &&
    !Array.isArray(value['interruptedQuests'])
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
  if (value['categories'] !== undefined && !Array.isArray(value['categories'])) {
    return false;
  }
  if (value['subCategories'] !== undefined && !Array.isArray(value['subCategories'])) {
    return false;
  }
  if (
    value['categorySystemInitialized'] !== undefined &&
    typeof value['categorySystemInitialized'] !== 'boolean'
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
  if (value['settings'] !== undefined) {
    if (!isRecord(value['settings'])) return false;
    const lastBackupAt = value['settings']['lastBackupAt'];
    if (
      lastBackupAt !== undefined &&
      lastBackupAt !== null &&
      typeof lastBackupAt !== 'string'
    ) {
      return false;
    }
    const tutorialCompletedAt = value['settings']['tutorialCompletedAt'];
    if (
      tutorialCompletedAt !== undefined &&
      tutorialCompletedAt !== null &&
      typeof tutorialCompletedAt !== 'string'
    ) {
      return false;
    }
    const navigationItems = value['settings']['navigationItems'];
    if (navigationItems !== undefined && !Array.isArray(navigationItems)) {
      return false;
    }
  }

  return true;
}

function normalizeTimerMode(value: unknown): 'stopwatch' | undefined {
  return value === 'stopwatch' ? 'stopwatch' : undefined;
}

function normalizeTask(task: Task): Task {
  const timerMode = normalizeTimerMode(task.timerMode);
  const estimatedMinutes = timerMode === 'stopwatch' ? 0 : task.estimatedMinutes;
  const withTimer =
    timerMode === task.timerMode && estimatedMinutes === task.estimatedMinutes
      ? task
      : { ...task, timerMode, estimatedMinutes };
  if (withTimer.scheduledDate !== undefined) return withTimer;
  const dateKey = taskScheduledDateKey(withTimer);
  return dateKey === undefined ? withTimer : { ...withTimer, scheduledDate: dateKey };
}

function normalizeWorkSession(session: WorkSession): WorkSession {
  const timerMode = normalizeTimerMode(session.timerMode);
  const carriedSeconds =
    session.carriedSeconds !== undefined && isFiniteNumber(session.carriedSeconds)
      ? Math.max(0, session.carriedSeconds)
      : undefined;
  if (timerMode === session.timerMode && carriedSeconds === session.carriedSeconds) {
    return session;
  }
  return { ...session, timerMode, carriedSeconds };
}

function normalizeInterruptedQuest(value: unknown): InterruptedQuest | null {
  if (!isRecord(value)) return null;
  if (
    typeof value['id'] !== 'string' ||
    typeof value['taskId'] !== 'string' ||
    !isFiniteNumber(value['elapsedSeconds']) ||
    typeof value['destinationId'] !== 'string' ||
    !isStringArray(value['assignedCharacterIds']) ||
    typeof value['firstStartedAt'] !== 'string' ||
    typeof value['interruptedAt'] !== 'string'
  ) {
    return null;
  }
  const taskTitleSnapshot = value['taskTitleSnapshot'];
  const categoryIdSnapshot = value['categoryIdSnapshot'];
  const categoryNameSnapshot = value['categoryNameSnapshot'];
  const subCategoryIdSnapshot = value['subCategoryIdSnapshot'];
  const subCategoryNameSnapshot = value['subCategoryNameSnapshot'];
  const lastSessionId = value['lastSessionId'];
  return {
    id: value['id'],
    taskId: value['taskId'],
    elapsedSeconds: Math.max(0, value['elapsedSeconds']),
    timerMode: normalizeTimerMode(value['timerMode']),
    destinationId: value['destinationId'],
    assignedCharacterIds: value['assignedCharacterIds'],
    taskTitleSnapshot: typeof taskTitleSnapshot === 'string' ? taskTitleSnapshot : undefined,
    categoryIdSnapshot: typeof categoryIdSnapshot === 'string' ? categoryIdSnapshot : undefined,
    categoryNameSnapshot: typeof categoryNameSnapshot === 'string' ? categoryNameSnapshot : undefined,
    subCategoryIdSnapshot:
      typeof subCategoryIdSnapshot === 'string' ? subCategoryIdSnapshot : undefined,
    subCategoryNameSnapshot:
      typeof subCategoryNameSnapshot === 'string' ? subCategoryNameSnapshot : undefined,
    firstStartedAt: value['firstStartedAt'],
    interruptedAt: value['interruptedAt'],
    lastSessionId: typeof lastSessionId === 'string' ? lastSessionId : undefined,
  };
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

function normalizeSettings(value: unknown): AppSettings {
  if (!isRecord(value)) {
    return {
      lastBackupAt: null,
      tutorialCompletedAt: null,
      navigationItems: createDefaultNavigationItems(),
    };
  }
  const lastBackupAt = value['lastBackupAt'];
  const tutorialCompletedAt = value['tutorialCompletedAt'];
  return {
    lastBackupAt:
      typeof lastBackupAt === 'string' && !Number.isNaN(Date.parse(lastBackupAt))
        ? lastBackupAt
        : null,
    tutorialCompletedAt:
      typeof tutorialCompletedAt === 'string' &&
      !Number.isNaN(Date.parse(tutorialCompletedAt))
        ? tutorialCompletedAt
        : null,
    navigationItems: normalizeNavigationItems(value['navigationItems']),
  };
}

/**
 * 旧バージョンの保存データに週間機能・休息イベントの初期値を補完する。
 * 既存のタスク・報酬・セッションは変更しない。
 */
export function normalizeAppState(state: AppState, now: Date = new Date()): AppState {
  const source = state as unknown as UnknownRecord;
  let tasks = (Array.isArray(source['tasks']) ? source['tasks'] : [])
    .filter(isTask)
    .map(normalizeTask);
  const sessionHistory = (Array.isArray(source['sessionHistory'])
    ? source['sessionHistory']
    : []
  )
    .filter(isWorkSession)
    .map(normalizeWorkSession);
  const rawActiveSession = source['activeSession'];
  const activeSession =
    rawActiveSession !== undefined && rawActiveSession !== null && isWorkSession(rawActiveSession)
      ? normalizeWorkSession(rawActiveSession)
      : null;
  const interruptedQuests = (
    Array.isArray(source['interruptedQuests']) ? source['interruptedQuests'] : []
  )
    .map(normalizeInterruptedQuest)
    .filter((quest): quest is InterruptedQuest => quest !== null);
  const characters = (Array.isArray(source['characters']) ? source['characters'] : [])
    .filter(isOwnedCharacter)
    .map(normalizeOwnedCharacter);
  const facilities = (Array.isArray(source['facilities']) ? source['facilities'] : []).filter(
    isOwnedFacility,
  );
  const inventory = normalizeInventory(source['inventory']);
  const itemInventory = normalizeItemInventoryWithLegacy(source['itemInventory'], inventory);
  const itemHistory = (Array.isArray(source['itemHistory']) ? source['itemHistory'] : [])
    .filter(isItemTransaction)
    .slice(0, BALANCE.maxItemHistory);
  const taskRewards = (Array.isArray(source['taskRewards']) ? source['taskRewards'] : [])
    .filter(isTaskCompletionReward)
    .slice(0, BALANCE.maxTaskRewards);
  const rawStardustCarry = source['stardustCarry'];
  const stardustCarry =
    isFiniteNumber(rawStardustCarry) && rawStardustCarry >= 0
      ? rawStardustCarry % 10
      : 0;
  const rewards = (Array.isArray(source['rewards']) ? source['rewards'] : [])
    .filter(isRewardRecord)
    .map(normalizeReward);
  const appliedRewardSessionIds = isStringArray(source['appliedRewardSessionIds'])
    ? Array.from(new Set(source['appliedRewardSessionIds']))
    : [];
  let recurrenceRules = (
    Array.isArray(source['recurrenceRules']) ? source['recurrenceRules'] : []
  ).filter(isRecurrenceRule);
  let categories = normalizeCategoryList(source['categories']);
  let subCategories = normalizeSubCategoryList(source['subCategories'], categories);
  let categorySystemInitialized = source['categorySystemInitialized'] === true;
  if (!categorySystemInitialized) {
    const migrated = migrateCategorySystem({
      tasks,
      recurrenceRules,
      categories,
      subCategories,
      nowIso: now.toISOString(),
    });
    tasks = migrated.tasks;
    recurrenceRules = migrated.recurrenceRules;
    categories = migrated.categories;
    subCategories = migrated.subCategories;
    categorySystemInitialized = true;
  }
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
  const candidate = state as AppState & {
    recurrenceRules?: RecurrenceRule[];
    weeklyEvaluations?: WeeklyEvaluation[];
    weeklyProgress?: WeeklyProgress;
    restWeeks?: string[];
    restSession?: unknown;
    supportEvents?: unknown[];
  };
  const restSession = normalizeRestSession(candidate.restSession);
  const supportEvents = Array.isArray(candidate.supportEvents)
    ? candidate.supportEvents
        .map(normalizeSupportEvent)
        .filter((event): event is SupportEvent => event !== null)
        .slice(0, BALANCE.maxSupportEvents)
    : [];
  const settings = normalizeSettings(source['settings']);

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
    interruptedQuests,
    inventory,
    itemInventory,
    itemHistory,
    taskRewards,
    stardustCarry,
    characters,
    facilities,
    rewards,
    appliedRewardSessionIds,
    recurrenceRules,
    categories,
    subCategories,
    categorySystemInitialized,
    weeklyEvaluations,
    weeklyProgress,
    restWeeks,
    restSession,
    supportEvents,
    settings,
  };
}

/**
 * 永続化する状態だけを取り出す。
 * ストア固有の hasHydrated / storageError / actions は保存しない。
 */
export function toAppStateSnapshot(state: AppState): AppState {
  return {
    version: 1,
    tasks: state.tasks,
    activeSession: state.activeSession,
    sessionHistory: state.sessionHistory,
    interruptedQuests: state.interruptedQuests,
    inventory: state.inventory,
    itemInventory: state.itemInventory,
    itemHistory: state.itemHistory,
    taskRewards: state.taskRewards,
    stardustCarry: state.stardustCarry,
    characters: state.characters,
    facilities: state.facilities,
    rewards: state.rewards,
    appliedRewardSessionIds: state.appliedRewardSessionIds,
    recurrenceRules: state.recurrenceRules,
    categories: state.categories,
    subCategories: state.subCategories,
    categorySystemInitialized: state.categorySystemInitialized,
    weeklyEvaluations: state.weeklyEvaluations,
    weeklyProgress: state.weeklyProgress,
    restWeeks: state.restWeeks,
    restSession: state.restSession,
    supportEvents: state.supportEvents,
    settings: state.settings,
  };
}
