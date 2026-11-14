import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { elapsedSeconds, totalElapsedSeconds } from './session';
import { facilityUpgradeCost } from './facility';
import {
  applyWeeklyStatus,
  combineDateAndTime,
  decideWeekStatus,
  enumerateWeekStarts,
  isRestWeekAllowed,
  isValidDateKey,
  isValidTime,
  isValidTimeRange,
  multiplierForStreak,
  nextWeekStartKey,
  previousWeekStartKey,
  summarizeWeek,
  toDateKey,
  weekStartKey,
  weekStartKeyFromDateKey,
  type WeekSummary,
} from './weekly';
import {
  buildOccurrenceTask,
  occurrenceDatesForWeek,
  occurrenceExists,
} from './recurrence';
import { BALANCE, WEEKLY_RULES } from './constants';
import {
  clampRestMinutes,
  isConsecutiveWork,
  isRestDue,
  supportMessage,
} from './rest';
import { initialAppState, toAppStateSnapshot, type AppState } from './appState';
import { parseBackup, type BackupParseResult } from './backup';
import {
  DEFAULT_SAVE_DEBOUNCE_MS,
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  loadAppStateFromStorage,
  type StorageAdapter,
} from './storage';
import {
  activeCategories,
  activeSubCategories,
  findCategoryById,
  findSubCategoryById,
} from './categories';
import { computeSessionReward } from './rewardService';
import { CHARACTER_DEFINITIONS } from './seed';
import { billableMinutes } from './session';
import { createItemTransaction, consumeItems, COIN_ITEM_ID } from './inventory/inventoryManager';
import { legacyInventoryFromItems } from './inventory/materialStorage';
import { applyExperienceToCharacter, planLevelUp } from './progression/levelSystem';
import { planAscension } from './progression/ascensionSystem';
import { evaluateTaskWithFallback, rollTaskReward } from './rewards/rewardCalculator';
import { applyTaskRewardToState } from './rewards/rewardProcessor';
import {
  createDefaultNavigationItems,
  moveNavigationItem as moveNavigationItemInList,
  setNavigationItemVisible as setNavigationItemVisibleInList,
} from './navigation';
import type {
  Category,
  InterruptedQuest,
  MobileNavItemId,
  OwnedCharacter,
  RecurrenceRule,
  RestSession,
  SessionResult,
  SubCategory,
  SupportEvent,
  SupportEventKind,
  Task,
  WeeklyEvaluation,
  WorkSession,
} from '@tasmate/types';

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

const WEEKLY_USER_ID = 'local-user';

export interface TaskInput {
  title: string;
  description: string;
  category: string;
  categoryId?: string;
  subject?: string;
  subCategoryId?: string;
  estimatedMinutes?: number;
  /** 計測方式。stopwatch の場合は予定時間を 0 として扱う */
  timerMode?: Task['timerMode'];
  scheduledAt?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
}

/** ストップウォッチ即時タスクの内容。予定日・予定時間は持たない */
export interface StopwatchTaskInput {
  title: string;
  description: string;
  category: string;
  categoryId?: string;
  subject?: string;
  subCategoryId?: string;
}

export interface RecurrenceRuleInput {
  title: string;
  description: string;
  category: string;
  categoryId?: string;
  subject?: string;
  subCategoryId?: string;
  estimatedMinutes: number;
  daysOfWeek: number[];
  startTime?: string;
  endTime?: string;
  effectiveFrom: string;
  effectiveUntil?: string;
}

/** 入力されたカテゴリー／サブカテゴリーをマスタと突き合わせて名称・IDを確定する */
interface ClassificationInput {
  category?: string;
  categoryId?: string;
  subject?: string;
  subCategoryId?: string;
  subCategoryName?: string;
}

interface ResolvedClassification {
  category: string;
  categoryId: string | undefined;
  subject: string | undefined;
  subCategoryId: string | undefined;
  subCategoryName: string | undefined;
}

export function resolveClassification(
  state: Pick<AppState, 'categories' | 'subCategories'>,
  input: ClassificationInput,
): ResolvedClassification {
  const byId =
    input.categoryId !== undefined
      ? findCategoryById(state.categories, input.categoryId)
      : undefined;
  const rawName = typeof input.category === 'string' ? input.category.trim() : '';
  const byName =
    rawName === '' ? undefined : state.categories.find((category) => category.name === rawName);
  const category = byId ?? byName;
  const categoryName = category?.name ?? (rawName === '' ? '勉強' : rawName);

  let subCategory =
    input.subCategoryId !== undefined
      ? findSubCategoryById(state.subCategories, input.subCategoryId)
      : undefined;
  if (subCategory !== undefined && subCategory.categoryId !== category?.id) {
    subCategory = undefined;
  }
  const rawSubName =
    (typeof input.subCategoryName === 'string' && input.subCategoryName.trim() !== ''
      ? input.subCategoryName
      : undefined) ??
    (typeof input.subject === 'string' && input.subject.trim() !== '' ? input.subject : undefined);
  const subName = rawSubName?.trim();
  if (subCategory === undefined && category !== undefined && subName !== undefined) {
    subCategory = state.subCategories.find(
      (item) => item.categoryId === category.id && item.name === subName,
    );
  }
  const resolvedSubName = subCategory?.name ?? (subName === '' ? undefined : subName);

  return {
    category: categoryName,
    categoryId: category?.id,
    subject: resolvedSubName,
    subCategoryId: subCategory?.id,
    subCategoryName: resolvedSubName,
  };
}

/**
 * 直近の削除操作。トーストの「元に戻す」で復元するために一時的に保持する。
 * 保存対象には含めない。
 */
export type PendingDeletion =
  | { kind: 'task'; id: string; label: string; deletedAt: string }
  | {
      kind: 'category';
      id: string;
      label: string;
      subCategoryIds: string[];
      deletedAt: string;
    }
  | { kind: 'subCategory'; id: string; label: string; deletedAt: string }
  | {
      kind: 'recurrenceRule';
      id: string;
      label: string;
      rule: RecurrenceRule;
      deletedAt: string;
    };

export interface AppActions {
  /** タスクを作成し、作成 ID を返す。失敗時は空文字 */
  createTask: (input: TaskInput) => string;
  /**
   * 内容を設定したストップウォッチタスクを作成し、その場で計測を開始する。
   * 予定日は付与しない。開始できなかった場合は null。
   */
  startStopwatchTask: (
    input: StopwatchTaskInput,
    destinationId: string,
    characterIds: string[],
  ) => string | null;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  /** 直近の削除を元に戻す。対象がない場合は何もしない */
  undoLastDeletion: () => void;
  /** 直近の削除トーストを閉じる */
  dismissLastDeletion: () => void;

  createRecurrenceRule: (input: RecurrenceRuleInput) => string;
  updateRecurrenceRule: (id: string, patch: Partial<RecurrenceRuleInput>) => void;
  deleteRecurrenceRule: (id: string) => void;
  ensureRecurringOccurrencesForWeek: (weekStart: string) => void;

  /** カテゴリーを追加する。空名・重複名は追加しない（戻り値は作成 ID、失敗時 ''） */
  addCategory: (name: string) => string;
  renameCategory: (id: string, name: string) => void;
  /** 論理削除。配下のサブカテゴリーも選択肢から外す */
  deleteCategory: (id: string) => void;
  moveCategory: (id: string, direction: 'up' | 'down') => void;

  /** サブカテゴリーを追加する。空名・重複名は追加しない（戻り値は作成 ID、失敗時 ''） */
  addSubCategory: (categoryId: string, name: string) => string;
  renameSubCategory: (id: string, name: string) => void;
  deleteSubCategory: (id: string) => void;
  moveSubCategory: (id: string, direction: 'up' | 'down') => void;

  startSession: (taskId: string, destinationId: string, characterIds: string[]) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  /** セッションを完了し報酬を確定する。戻り値は確定した報酬レコードの ID（報酬なしの場合 null） */
  finishSession: () => string | null;
  /**
   * 現在の作業分の報酬を確定し、残り時間を保持したままクエストを中断する。
   * 戻り値は確定した報酬レコードの ID（報酬なしの場合 null）
   */
  interruptSession: () => string | null;
  /** 中断中のクエストを再開する。進行中のセッションがある場合は何もしない */
  resumeInterruptedQuest: (id: string) => void;
  /** 中断中のクエストを破棄し、タスクを予定に戻す。追加報酬は付与しない */
  discardInterruptedQuest: (id: string) => void;
  cancelSession: () => void;

  /** 休憩を開始する。時間は有効範囲に丸められる */
  startRest: (plannedMinutes: number, sourceSessionId?: string) => void;
  /** 設定時間が経過した休憩を完了し、応援イベントを追加する */
  completeRest: () => void;
  /** 進行中の休憩を切り上げる */
  skipRest: () => void;
  /** 長時間の連続作業を検出したら応援イベントを一度だけ追加する */
  checkLongWorkSupport: () => void;
  /** 応援イベントを確認済みにする */
  acknowledgeSupportEvent: (id: string) => void;

  levelUpCharacter: (definitionId: string) => boolean;
  /** レベル上限を解放する。レベルが現在の上限に達し、素材が揃っている場合のみ成功する */
  ascendCharacter: (definitionId: string) => boolean;
  upgradeFacility: (definitionId: string) => boolean;
  toggleFacility: (definitionId: string) => void;

  /** 未判定の過去週を古い順に判定する。同じ週は再判定しない */
  evaluateDueWeeks: (nowMs?: number) => WeeklyEvaluation[];
  /** 休息週の設定を切り替える。設定できない場合は false */
  toggleRestWeek: (weekStart: string) => boolean;

  resetAll: () => void;

  /** バックアップ文字列から状態を復元する。進行中のタイマー・休憩は破棄する */
  importAppState: (raw: string) => BackupParseResult;
  /** バックアップを書き出した日時を記録する */
  markBackupExported: (exportedAt: string) => void;

  /** モバイル版サイドバーの項目を表示・非表示にする。出撃は常に表示 */
  setNavigationItemVisible: (id: MobileNavItemId, visible: boolean) => void;
  /** モバイル版サイドバーの項目を1つ上または下へ移動する */
  moveNavigationItem: (id: MobileNavItemId, direction: 'up' | 'down') => void;
  /** モバイル版サイドバーの並びを初期状態に戻す */
  resetNavigationItems: () => void;

  /** 非同期ストレージから状態を復元する。復元済みなら何もしない */
  hydrate: () => Promise<void>;
  /** 保留中の保存を即座に実行し、完了を待つ */
  flush: () => Promise<void>;
}

export interface AppStore extends AppState, AppActions {
  /** 復元が完了したか。Native では復元完了まで UI 操作を止めるために使う */
  hasHydrated: boolean;
  /** 直近の保存・復元エラー。成功すると null に戻る */
  storageError: string | null;
  /** 保存先が利用可能か。読み込み失敗時は false になり、保存を停止する */
  canPersist: boolean;
  /** 直近の削除。トーストからの復元にだけ使い、保存はしない */
  lastDeletion: PendingDeletion | null;
}

/** 現在のセッションの経過秒数を算出するセレクタ用ヘルパー */
export function sessionElapsedSeconds(session: WorkSession | null, nowMs: number): number {
  if (session === null) return 0;
  return elapsedSeconds(
    Date.parse(session.startedAt),
    session.accumulatedSeconds,
    session.pausedAt !== undefined ? Date.parse(session.pausedAt) : undefined,
    nowMs,
  );
}

/** 中断から再開した分を含む、クエスト全体の累計作業秒数 */
export function sessionTotalElapsedSeconds(session: WorkSession | null, nowMs: number): number {
  if (session === null) return 0;
  return totalElapsedSeconds(sessionElapsedSeconds(session, nowMs), session.carriedSeconds);
}

/** 現在の連続達成週数に対応する報酬倍率 */
export function currentWeeklyMultiplier(state: Pick<AppState, 'weeklyProgress'>): number {
  return multiplierForStreak(state.weeklyProgress.currentStreak);
}

/** 応援イベントを出すキャラクターを決める（派遣キャラ優先、いなければ所持キャラ） */
function pickSupportCharacterId(
  session: WorkSession | undefined,
  characters: OwnedCharacter[],
): string {
  const assignedId = session?.assignedCharacterIds[0];
  if (
    assignedId !== undefined &&
    CHARACTER_DEFINITIONS.some((definition) => definition.id === assignedId)
  ) {
    return assignedId;
  }
  return characters[0]?.definitionId ?? CHARACTER_DEFINITIONS[0].id;
}

function characterName(characterId: string): string {
  return CHARACTER_DEFINITIONS.find((definition) => definition.id === characterId)?.name ?? '仲間';
}

function createSupportEvent(
  kind: SupportEventKind,
  characterId: string,
  workSessionId: string | undefined,
  createdAt: string,
): SupportEvent {
  return {
    id: newId('support'),
    kind,
    characterId,
    message: supportMessage(kind, characterName(characterId)),
    createdAt,
    workSessionId,
    seen: false,
  };
}

function appendSupportEvent(events: SupportEvent[], event: SupportEvent): SupportEvent[] {
  return [event, ...events].slice(0, BALANCE.maxSupportEvents);
}

/** 現在の週（未判定）の集計。画面表示用 */
export function summarizeCurrentWeek(tasks: Task[], now: Date = new Date()): {
  weekStart: string;
  summary: WeekSummary;
} {
  const weekStart = weekStartKey(now);
  return { weekStart, summary: summarizeWeek(tasks, weekStart) };
}

function sanitizeSchedule(
  scheduledDate: string | undefined,
  startTime: string | undefined,
  endTime: string | undefined,
): Pick<Task, 'scheduledDate' | 'startTime' | 'endTime'> | null {
  const date = scheduledDate !== undefined && isValidDateKey(scheduledDate) ? scheduledDate : undefined;
  const start = startTime !== undefined && isValidTime(startTime) ? startTime : undefined;
  const end = endTime !== undefined && isValidTime(endTime) ? endTime : undefined;
  if (!isValidTimeRange(start, end)) return null;
  if (date === undefined && (start !== undefined || end !== undefined)) return null;
  return { scheduledDate: date, startTime: start, endTime: end };
}

function sanitizeRecurrenceSchedule(
  daysOfWeek: number[],
  startTime?: string,
  endTime?: string,
): { daysOfWeek: number[]; startTime?: string; endTime?: string } | null {
  const days = Array.from(
    new Set(daysOfWeek.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)),
  ).sort((a, b) => a - b);
  if (days.length === 0) return null;
  const start = startTime !== undefined && isValidTime(startTime) ? startTime : undefined;
  const end = endTime !== undefined && isValidTime(endTime) ? endTime : undefined;
  if (!isValidTimeRange(start, end)) return null;
  return { daysOfWeek: days, startTime: start, endTime: end };
}

function isRuleArchivedOccurrence(task: Task, ruleId: string, dateKey: string): boolean {
  if (
    task.recurrenceId !== ruleId ||
    task.archivedAt === undefined ||
    task.archiveReason !== 'rule'
  ) {
    return false;
  }
  return (
    task.scheduledDate === dateKey ||
    (task.scheduledDate === undefined && task.scheduledAt?.startsWith(dateKey) === true)
  );
}

/** 曜日の再追加などでルール変更時にアーカイブした予定を復元する */
function restoreRuleArchivedOccurrences(
  rule: RecurrenceRule,
  tasks: Task[],
  dateKey: string,
  timestamp: string,
): Task[] {
  let changed = false;
  const result = tasks.map((task) => {
    if (!isRuleArchivedOccurrence(task, rule.id, dateKey)) return task;
    changed = true;
    return {
      ...task,
      title: rule.title,
      description: rule.description,
      category: rule.category,
      subject: rule.subject,
      estimatedMinutes: rule.estimatedMinutes,
      startTime: rule.startTime,
      endTime: rule.endTime,
      scheduledAt: combineDateAndTime(dateKey, rule.startTime),
      archivedAt: undefined,
      archiveReason: undefined,
      updatedAt: timestamp,
    };
  });
  return changed ? result : tasks;
}

function generateOccurrencesForWeek(
  rule: RecurrenceRule,
  tasks: Task[],
  weekStart: string,
  timestamp: string,
): Task[] {
  let result = tasks;
  for (const dateKey of occurrenceDatesForWeek(rule, weekStart)) {
    result = restoreRuleArchivedOccurrences(rule, result, dateKey, timestamp);
    if (occurrenceExists(result, rule.id, dateKey)) continue;
    result = [...result, buildOccurrenceTask(rule, dateKey, newId('task'), timestamp)];
  }
  return result;
}

/** ルール変更を、完了・アーカイブされていない今後の予定へ反映する */
function applyRuleToUpcomingOccurrences(
  tasks: Task[],
  rule: RecurrenceRule,
  todayKey: string,
): Task[] {
  return tasks.map((task) => {
    if (task.recurrenceId !== rule.id) return task;
    if (task.archivedAt !== undefined || task.status === 'completed') return task;
    // 日付を移動した単発の変更は、ルール変更で上書き・アーカイブしない
    if (
      task.originalScheduledDate !== undefined &&
      task.originalScheduledDate !== task.scheduledDate
    ) {
      return task;
    }
    const dateKey = task.scheduledDate;
    if (dateKey === undefined || dateKey < todayKey) return task;
    if (!rule.isActive || !occurrenceDatesForWeek(rule, weekStartKeyFromDateKey(dateKey)).includes(dateKey)) {
      return { ...task, archivedAt: nowIso(), archiveReason: 'rule' as const, updatedAt: nowIso() };
    }
    return {
      ...task,
      title: rule.title,
      description: rule.description,
      category: rule.category,
      categoryId: rule.categoryId,
      subject: rule.subject,
      subCategoryId: rule.subCategoryId,
      subCategoryName: rule.subCategoryName,
      estimatedMinutes: rule.estimatedMinutes,
      startTime: rule.startTime,
      endTime: rule.endTime,
      scheduledAt: combineDateAndTime(dateKey, rule.startTime),
      updatedAt: nowIso(),
    };
  });
}

export interface CreateAppStoreOptions {
  /** 省略時は保存しない（テストやプレビュー用） */
  storage?: StorageAdapter | null;
  /** 同期読み込み済みの初期状態。Web版は localStorage から同期復元する */
  initialState?: AppState;
  storageKey?: string;
  legacyStorageKey?: string;
  saveDebounceMs?: number;
  /**
   * 読み込み失敗時など、既存データを上書きしてはいけない場合に false を渡す。
   * 省略時は同期初期状態があるか、保存先が未設定なら true。
   */
  canPersist?: boolean;
}

interface SessionSettlement {
  elapsed: number;
  endedAt: string;
  finished: WorkSession;
  record: ReturnType<typeof computeSessionReward>;
  taskRewardResult: ReturnType<typeof rollTaskReward>;
}

type SettlementState = Pick<
  AppStore,
  | 'tasks'
  | 'characters'
  | 'facilities'
  | 'taskRewards'
  | 'stardustCarry'
  | 'weeklyProgress'
  | 'appliedRewardSessionIds'
>;

/**
 * セッション1区間分の報酬を確定する。
 * 中断からの再開では区間ごとに報酬を確定するため、累計時間ではなく区間の経過秒数だけを使う。
 */
function settleSession(
  state: SettlementState,
  session: WorkSession,
  result: SessionResult,
  nowMs: number,
): SessionSettlement | null {
  if (state.appliedRewardSessionIds.includes(session.id)) return null;
  const elapsed = sessionElapsedSeconds(session, nowMs);
  const endedAt = new Date(nowMs).toISOString();
  const finished: WorkSession = { ...session, state: 'idle', result, endedAt };
  const task = state.tasks.find((t) => t.id === session.taskId);
  const record = computeSessionReward({
    session: finished,
    task,
    characters: state.characters,
    facilities: state.facilities,
    elapsedSec: elapsed,
    nowIso: endedAt,
    rewardMultiplier: currentWeeklyMultiplier(state),
  });
  const actualMinutes = billableMinutes(elapsed, BALANCE.minimumBillableSeconds);
  const alreadyRewarded = state.taskRewards.some((reward) => reward.taskId === session.taskId);
  const taskRewardResult = rollTaskReward({
    taskId: session.taskId,
    workSessionId: session.id,
    rewardRecordId: record.id,
    task,
    actualMinutes,
    coins: record.finalReward.currency,
    completed: result === 'completed',
    evaluation: evaluateTaskWithFallback({ task, actualMinutes }),
    targetCharacterId: session.assignedCharacterIds[0] ?? null,
    previousStardustCarry: state.stardustCarry,
    nowIso: endedAt,
    suppressDrops: alreadyRewarded,
  });
  return { elapsed, endedAt, finished, record, taskRewardResult };
}

function buildInterruptedQuest(
  session: WorkSession,
  elapsed: number,
  endedAt: string,
): InterruptedQuest {
  return {
    id: newId('interrupt'),
    taskId: session.taskId,
    elapsedSeconds: totalElapsedSeconds(elapsed, session.carriedSeconds),
    timerMode: session.timerMode,
    destinationId: session.destinationId,
    assignedCharacterIds: session.assignedCharacterIds,
    taskTitleSnapshot: session.taskTitleSnapshot,
    categoryIdSnapshot: session.categoryIdSnapshot,
    categoryNameSnapshot: session.categoryNameSnapshot,
    subCategoryIdSnapshot: session.subCategoryIdSnapshot,
    subCategoryNameSnapshot: session.subCategoryNameSnapshot,
    firstStartedAt: session.firstStartedAt ?? session.startedAt,
    interruptedAt: endedAt,
    lastSessionId: session.id,
  };
}

export function createAppStore(options: CreateAppStoreOptions = {}) {
  const storage = options.storage ?? null;
  const storageKey = options.storageKey ?? STORAGE_KEY;
  const legacyStorageKey = options.legacyStorageKey ?? LEGACY_STORAGE_KEY;
  const debounceMs = options.saveDebounceMs ?? DEFAULT_SAVE_DEBOUNCE_MS;
  const startState = options.initialState ?? initialAppState();
  const startsHydrated = options.initialState !== undefined || storage === null;

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSnapshot: AppState | null = null;
  let desiredJson: string | null = null;
  let inFlightJson: string | null = null;
  let failedJson: string | null = null;
  let lastSavedJson: string | null = null;
  let lastObservedJson: string | null = null;
  let saving = false;
  let canPersist = options.canPersist ?? (options.initialState !== undefined || storage === null);
  const idleWaiters: Array<() => void> = [];
  let hydrationPromise: Promise<void> | null = null;

  const reportError = (error: unknown): void => {
    const message = error instanceof Error ? error.message : '保存に失敗しました';
    store.setState({ storageError: message });
  };

  const resolveIdle = (): void => {
    if (saving || desiredJson !== null) return;
    while (idleWaiters.length > 0) idleWaiters.pop()?.();
  };

  const pump = async (): Promise<void> => {
    if (saving || storage === null || !canPersist) return;
    saving = true;
    while (desiredJson !== null && canPersist) {
      const json = desiredJson;
      desiredJson = null;
      if (json === lastSavedJson) continue;
      inFlightJson = json;
      try {
        await storage.setItem(storageKey, json);
        lastSavedJson = json;
        failedJson = null;
        if (store.getState().storageError !== null) store.setState({ storageError: null });
      } catch (error) {
        failedJson = json;
        reportError(error);
      } finally {
        inFlightJson = null;
      }
    }
    saving = false;
    resolveIdle();
  };

  const enqueueJson = (json: string): void => {
    if (storage === null || !canPersist) return;
    if (json === inFlightJson) return;
    // 保存中・保存待ち・失敗分が残っている間は、lastSavedJson と同じ値でも
    // 最新スナップショットとして扱う。古い内容が後から書き込まれるのを防ぐ。
    if (!saving && json === lastSavedJson) {
      failedJson = null;
      return;
    }
    desiredJson = json;
    void pump();
  };

  const scheduleSave = (state: AppStore): void => {
    if (storage === null || !state.hasHydrated || !canPersist) return;
    const snapshot = toAppStateSnapshot(state);
    const json = JSON.stringify(snapshot);
    // storageError などのストア内部状態だけが変わった場合は保存しない
    if (json === lastObservedJson) return;
    lastObservedJson = json;
    pendingSnapshot = snapshot;
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      const pending = pendingSnapshot;
      pendingSnapshot = null;
      if (pending !== null) enqueueJson(JSON.stringify(pending));
    }, debounceMs);
  };

  const waitForIdle = (): Promise<void> => {
    if (!saving) return Promise.resolve();
    return new Promise((resolve) => {
      idleWaiters.push(resolve);
    });
  };

  const flush = async (): Promise<void> => {
    if (storage === null || !canPersist) return;
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (pendingSnapshot !== null) {
      const pending = pendingSnapshot;
      pendingSnapshot = null;
      enqueueJson(JSON.stringify(pending));
    }
    await waitForIdle();
    // 一時的な保存失敗を取りこぼさないよう、flush 時に一度だけ再試行する
    if (failedJson !== null) {
      const retry = failedJson;
      failedJson = null;
      enqueueJson(retry);
      await waitForIdle();
    }
  };

  const hydrate = async (): Promise<void> => {
    if (storage === null) {
      store.setState({ hasHydrated: true });
      return;
    }
    if (store.getState().hasHydrated) return;
    if (hydrationPromise !== null) return hydrationPromise;
    hydrationPromise = (async () => {
      const result = await loadAppStateFromStorage(storage, { storageKey, legacyStorageKey });
      if (result.state !== null) {
        canPersist = true;
        lastSavedJson = result.serialized;
        failedJson = null;
        desiredJson = null;
        store.setState({
          ...result.state,
          hasHydrated: true,
          storageError: result.error,
          canPersist: true,
          lastDeletion: null,
        });
        return;
      }
      if (result.readFailed) {
        // 読み込み失敗時は既存データを守るため、保存を停止する。
        // 破損データ（パース失敗）とは区別し、次回起動時の復元に委ねる。
        canPersist = false;
        lastSavedJson = null;
        store.setState({ hasHydrated: true, storageError: result.error, canPersist: false });
        return;
      }
      // 破損データを復元直後に上書きしない。次の状態変更まで保存を待つ
      canPersist = true;
      lastSavedJson = JSON.stringify(toAppStateSnapshot(initialAppState()));
      store.setState({ hasHydrated: true, storageError: result.error, canPersist: true });
    })()
      .catch((error: unknown) => {
        canPersist = false;
        reportError(error);
        store.setState({ hasHydrated: true, canPersist: false });
      })
      .finally(() => {
        hydrationPromise = null;
      });
    return hydrationPromise;
  };

  const store: UseBoundStore<StoreApi<AppStore>> = create<AppStore>()((set, get) => ({
    ...startState,
    hasHydrated: startsHydrated,
    storageError: null,
    canPersist,
    lastDeletion: null,
    hydrate,
    flush,

  createTask: (input) => {
    const timestamp = nowIso();
    const title = input.title.trim();
    if (title.length === 0) return '';
    const schedule = sanitizeSchedule(input.scheduledDate, input.startTime, input.endTime);
    if (schedule === null) return '';
    const timerMode = input.timerMode === 'stopwatch' ? 'stopwatch' : undefined;
    // ストップウォッチは予定時間を持たない（0 = 見積なし）
    const estimatedMinutes =
      timerMode === 'stopwatch'
        ? 0
        : Math.max(1, Math.floor(input.estimatedMinutes ?? 25) || 25);
    const classification = resolveClassification(get(), input);
    const task: Task = {
      id: newId('task'),
      title,
      description: input.description.trim(),
      category: classification.category,
      categoryId: classification.categoryId,
      subject: classification.subject,
      subCategoryId: classification.subCategoryId,
      subCategoryName: classification.subCategoryName,
      estimatedMinutes,
      timerMode,
      scheduledAt:
        input.scheduledAt ?? combineDateAndTime(schedule.scheduledDate ?? '', schedule.startTime),
      scheduledDate: schedule.scheduledDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: 'planned',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((s) => ({ tasks: [task, ...s.tasks] }));
    return task.id;
  },

  startStopwatchTask: (input, destinationId, characterIds) => {
    const state = get();
    if (state.activeSession !== null || characterIds.length === 0) return null;
    const taskId = state.createTask({
      title: input.title,
      description: input.description,
      category: input.category,
      categoryId: input.categoryId,
      subject: input.subject,
      subCategoryId: input.subCategoryId,
      timerMode: 'stopwatch',
    });
    if (taskId === '') return null;
    get().startSession(taskId, destinationId, characterIds);
    return get().activeSession?.id ?? null;
  },

  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const merged: Task = { ...t, ...patch, updatedAt: nowIso() };
        if (
          'category' in patch ||
          'categoryId' in patch ||
          'subject' in patch ||
          'subCategoryId' in patch ||
          'subCategoryName' in patch
        ) {
          Object.assign(
            merged,
            resolveClassification(s, {
              category: patch.category ?? t.category,
              categoryId: 'categoryId' in patch ? patch.categoryId : t.categoryId,
              subject: 'subject' in patch ? patch.subject : (t.subCategoryName ?? t.subject),
              subCategoryId:
                'subCategoryId' in patch ? patch.subCategoryId : t.subCategoryId,
              subCategoryName:
                'subCategoryName' in patch ? patch.subCategoryName : t.subCategoryName,
            }),
          );
        }
        if (
          'scheduledDate' in patch &&
          patch.scheduledDate !== t.scheduledDate &&
          t.recurrenceId !== undefined &&
          t.originalScheduledDate === undefined &&
          t.scheduledDate !== undefined
        ) {
          // 繰り返し予定の日付移動は「その回だけ」の変更として元の日付を保持する
          merged.originalScheduledDate = t.scheduledDate;
        }
        if ('scheduledDate' in patch || 'startTime' in patch || 'endTime' in patch) {
          const schedule = sanitizeSchedule(
            merged.scheduledDate,
            merged.startTime,
            merged.endTime,
          );
          if (schedule === null) return t;
          merged.scheduledDate = schedule.scheduledDate;
          merged.startTime = schedule.startTime;
          merged.endTime = schedule.endTime;
          merged.scheduledAt =
            schedule.scheduledDate !== undefined
              ? combineDateAndTime(schedule.scheduledDate, schedule.startTime)
              : undefined;
        }
        return merged;
      }),
    })),

  deleteTask: (id) =>
    set((s) => {
      // 進行中・中断中のタスクは削除不可
      if (s.activeSession?.taskId === id) return s;
      if (s.interruptedQuests.some((quest) => quest.taskId === id)) return s;
      const target = s.tasks.find((task) => task.id === id);
      if (target === undefined || target.archivedAt !== undefined) return s;
      const timestamp = nowIso();
      return {
        tasks: s.tasks.map((t) =>
          t.id === id
            ? { ...t, archivedAt: timestamp, archiveReason: 'user' as const, updatedAt: timestamp }
            : t,
        ),
        lastDeletion: {
          kind: 'task' as const,
          id,
          label: target.title,
          deletedAt: timestamp,
        },
      };
    }),

  addCategory: (name) => {
    const trimmed = name.trim();
    if (trimmed === '') return '';
    let createdId = '';
    set((s) => {
      if (s.categories.some((category) => category.archivedAt === undefined && category.name === trimmed)) {
        return s;
      }
      const timestamp = nowIso();
      const order = activeCategories(s.categories).reduce(
        (max, category) => Math.max(max, category.order + 1),
        0,
      );
      const category: Category = {
        id: newId('category'),
        name: trimmed,
        order,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      createdId = category.id;
      return { categories: [...s.categories, category] };
    });
    return createdId;
  },

  renameCategory: (id, name) =>
    set((s) => {
      const trimmed = name.trim();
      const current = s.categories.find((category) => category.id === id);
      if (current === undefined || trimmed === '') return s;
      if (
        s.categories.some(
          (category) =>
            category.id !== id &&
            category.archivedAt === undefined &&
            category.name === trimmed,
        )
      ) {
        return s;
      }
      const timestamp = nowIso();
      return {
        categories: s.categories.map((category) =>
          category.id === id ? { ...category, name: trimmed, updatedAt: timestamp } : category,
        ),
        tasks: s.tasks.map((task) =>
          task.categoryId === id ? { ...task, category: trimmed, updatedAt: timestamp } : task,
        ),
        recurrenceRules: s.recurrenceRules.map((rule) =>
          rule.categoryId === id ? { ...rule, category: trimmed, updatedAt: timestamp } : rule,
        ),
      };
    }),

  deleteCategory: (id) =>
    set((s) => {
      const current = s.categories.find((category) => category.id === id);
      if (current === undefined || current.archivedAt !== undefined) return s;
      const timestamp = nowIso();
      const subCategoryIds = s.subCategories
        .filter((subCategory) => subCategory.categoryId === id && subCategory.archivedAt === undefined)
        .map((subCategory) => subCategory.id);
      return {
        categories: s.categories.map((category) =>
          category.id === id
            ? { ...category, archivedAt: timestamp, updatedAt: timestamp }
            : category,
        ),
        subCategories: s.subCategories.map((subCategory) =>
          subCategory.categoryId === id && subCategory.archivedAt === undefined
            ? { ...subCategory, archivedAt: timestamp, updatedAt: timestamp }
            : subCategory,
        ),
        lastDeletion: {
          kind: 'category' as const,
          id,
          label: current.name,
          subCategoryIds,
          deletedAt: timestamp,
        },
      };
    }),

  moveCategory: (id, direction) =>
    set((s) => {
      const ordered = activeCategories(s.categories);
      const index = ordered.findIndex((category) => category.id === id);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= ordered.length) return s;
      const swapped = [...ordered];
      const current = swapped[index];
      const other = swapped[target];
      if (current === undefined || other === undefined) return s;
      swapped[index] = other;
      swapped[target] = current;
      const timestamp = nowIso();
      const orderById = new Map(swapped.map((category, order) => [category.id, order]));
      return {
        categories: s.categories.map((category) => {
          const order = orderById.get(category.id);
          return order === undefined || order === category.order
            ? category
            : { ...category, order, updatedAt: timestamp };
        }),
      };
    }),

  addSubCategory: (categoryId, name) => {
    const trimmed = name.trim();
    if (trimmed === '') return '';
    let createdId = '';
    set((s) => {
      const category = findCategoryById(s.categories, categoryId);
      if (category === undefined || category.archivedAt !== undefined) return s;
      if (
        s.subCategories.some(
          (subCategory) =>
            subCategory.categoryId === categoryId &&
            subCategory.archivedAt === undefined &&
            subCategory.name === trimmed,
        )
      ) {
        return s;
      }
      const timestamp = nowIso();
      const order = activeSubCategories(s.subCategories, categoryId).reduce(
        (max, subCategory) => Math.max(max, subCategory.order + 1),
        0,
      );
      const subCategory: SubCategory = {
        id: newId('subcategory'),
        categoryId,
        name: trimmed,
        order,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      createdId = subCategory.id;
      return { subCategories: [...s.subCategories, subCategory] };
    });
    return createdId;
  },

  renameSubCategory: (id, name) =>
    set((s) => {
      const trimmed = name.trim();
      const current = s.subCategories.find((subCategory) => subCategory.id === id);
      if (current === undefined || trimmed === '') return s;
      if (
        s.subCategories.some(
          (subCategory) =>
            subCategory.id !== id &&
            subCategory.categoryId === current.categoryId &&
            subCategory.archivedAt === undefined &&
            subCategory.name === trimmed,
        )
      ) {
        return s;
      }
      const timestamp = nowIso();
      return {
        subCategories: s.subCategories.map((subCategory) =>
          subCategory.id === id ? { ...subCategory, name: trimmed, updatedAt: timestamp } : subCategory,
        ),
        tasks: s.tasks.map((task) =>
          task.subCategoryId === id
            ? {
                ...task,
                subject: trimmed,
                subCategoryName: trimmed,
                updatedAt: timestamp,
              }
            : task,
        ),
        recurrenceRules: s.recurrenceRules.map((rule) =>
          rule.subCategoryId === id
            ? {
                ...rule,
                subject: trimmed,
                subCategoryName: trimmed,
                updatedAt: timestamp,
              }
            : rule,
        ),
      };
    }),

  deleteSubCategory: (id) =>
    set((s) => {
      const current = s.subCategories.find((subCategory) => subCategory.id === id);
      if (current === undefined || current.archivedAt !== undefined) return s;
      const timestamp = nowIso();
      return {
        subCategories: s.subCategories.map((subCategory) =>
          subCategory.id === id
            ? { ...subCategory, archivedAt: timestamp, updatedAt: timestamp }
            : subCategory,
        ),
        lastDeletion: {
          kind: 'subCategory' as const,
          id,
          label: current.name,
          deletedAt: timestamp,
        },
      };
    }),

  moveSubCategory: (id, direction) =>
    set((s) => {
      const current = s.subCategories.find((subCategory) => subCategory.id === id);
      if (current === undefined) return s;
      const ordered = activeSubCategories(s.subCategories, current.categoryId);
      const index = ordered.findIndex((subCategory) => subCategory.id === id);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= ordered.length) return s;
      const swapped = [...ordered];
      const first = swapped[index];
      const second = swapped[target];
      if (first === undefined || second === undefined) return s;
      swapped[index] = second;
      swapped[target] = first;
      const timestamp = nowIso();
      const orderById = new Map(swapped.map((subCategory, order) => [subCategory.id, order]));
      return {
        subCategories: s.subCategories.map((subCategory) => {
          const order = orderById.get(subCategory.id);
          return order === undefined || order === subCategory.order
            ? subCategory
            : { ...subCategory, order, updatedAt: timestamp };
        }),
      };
    }),

  createRecurrenceRule: (input) => {
    const title = input.title.trim();
    if (title.length === 0) return '';
    if (!isValidDateKey(input.effectiveFrom)) return '';
    if (
      input.effectiveUntil !== undefined &&
      (!isValidDateKey(input.effectiveUntil) || input.effectiveUntil < input.effectiveFrom)
    ) {
      return '';
    }
    const schedule = sanitizeRecurrenceSchedule(input.daysOfWeek, input.startTime, input.endTime);
    if (schedule === null) return '';
    const timestamp = nowIso();
    const classification = resolveClassification(get(), input);
    const rule: RecurrenceRule = {
      id: newId('rule'),
      title,
      description: input.description.trim(),
      category: classification.category,
      categoryId: classification.categoryId,
      subject: classification.subject,
      subCategoryId: classification.subCategoryId,
      subCategoryName: classification.subCategoryName,
      estimatedMinutes: Math.max(1, Math.floor(input.estimatedMinutes) || 25),
      frequency: 'weekly',
      daysOfWeek: schedule.daysOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((s) => ({
      recurrenceRules: [rule, ...s.recurrenceRules],
      tasks: generateOccurrencesForWeek(
        rule,
        s.tasks,
        weekStartKeyFromDateKey(rule.effectiveFrom),
        timestamp,
      ),
    }));
    return rule.id;
  },

  updateRecurrenceRule: (id, patch) =>
    set((s) => {
      const current = s.recurrenceRules.find((rule) => rule.id === id);
      if (current === undefined) return s;
      const mergedInput: RecurrenceRuleInput = {
        title: patch.title ?? current.title,
        description: patch.description ?? current.description,
        category: patch.category ?? current.category,
        categoryId: 'categoryId' in patch ? patch.categoryId : current.categoryId,
        subject: 'subject' in patch ? patch.subject : current.subject,
        subCategoryId: 'subCategoryId' in patch ? patch.subCategoryId : current.subCategoryId,
        estimatedMinutes: patch.estimatedMinutes ?? current.estimatedMinutes,
        daysOfWeek: patch.daysOfWeek ?? current.daysOfWeek,
        startTime: 'startTime' in patch ? patch.startTime : current.startTime,
        endTime: 'endTime' in patch ? patch.endTime : current.endTime,
        effectiveFrom: patch.effectiveFrom ?? current.effectiveFrom,
        effectiveUntil: 'effectiveUntil' in patch ? patch.effectiveUntil : current.effectiveUntil,
      };
      if (mergedInput.title.trim() === '') return s;
      if (!isValidDateKey(mergedInput.effectiveFrom)) return s;
      if (
        mergedInput.effectiveUntil !== undefined &&
        (!isValidDateKey(mergedInput.effectiveUntil) ||
          mergedInput.effectiveUntil < mergedInput.effectiveFrom)
      ) {
        return s;
      }
      const schedule = sanitizeRecurrenceSchedule(
        mergedInput.daysOfWeek,
        mergedInput.startTime,
        mergedInput.endTime,
      );
      if (schedule === null) return s;
      const timestamp = nowIso();
      const classification = resolveClassification(s, mergedInput);
      const updated: RecurrenceRule = {
        ...current,
        title: mergedInput.title.trim(),
        description: mergedInput.description.trim(),
        category: classification.category,
        categoryId: classification.categoryId,
        subject: classification.subject,
        subCategoryId: classification.subCategoryId,
        subCategoryName: classification.subCategoryName,
        estimatedMinutes: Math.max(1, Math.floor(mergedInput.estimatedMinutes) || 25),
        daysOfWeek: schedule.daysOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        effectiveFrom: mergedInput.effectiveFrom,
        effectiveUntil: mergedInput.effectiveUntil,
        updatedAt: timestamp,
      };
      const todayKey = toDateKey(new Date());
      let tasks = applyRuleToUpcomingOccurrences(s.tasks, updated, todayKey);
      // 追加された曜日の予定を、今週から4週先まで生成する
      let cursor = weekStartKey(new Date());
      for (let index = 0; index < 5; index += 1) {
        tasks = generateOccurrencesForWeek(updated, tasks, cursor, timestamp);
        cursor = nextWeekStartKey(cursor);
      }
      return {
        recurrenceRules: s.recurrenceRules.map((rule) => (rule.id === id ? updated : rule)),
        tasks,
      };
    }),

  deleteRecurrenceRule: (id) =>
    set((s) => {
      const rule = s.recurrenceRules.find((item) => item.id === id);
      if (rule === undefined) return s;
      const timestamp = nowIso();
      const todayKey = toDateKey(new Date());
      return {
        recurrenceRules: s.recurrenceRules.filter((item) => item.id !== id),
        tasks: s.tasks.map((task) =>
          task.recurrenceId === id &&
          task.status !== 'completed' &&
          task.status !== 'interrupted' &&
          !s.interruptedQuests.some((quest) => quest.taskId === task.id) &&
          task.archivedAt === undefined &&
          task.scheduledDate !== undefined &&
          task.scheduledDate >= todayKey
            ? { ...task, archivedAt: timestamp, archiveReason: 'rule' as const, updatedAt: timestamp }
            : task,
        ),
        lastDeletion: {
          kind: 'recurrenceRule' as const,
          id,
          label: rule.title,
          rule,
          deletedAt: timestamp,
        },
      };
    }),

  undoLastDeletion: () =>
    set((s) => {
      const pending = s.lastDeletion;
      if (pending === null) return s;
      const timestamp = nowIso();
      switch (pending.kind) {
        case 'task':
          return {
            tasks: s.tasks.map((task) =>
              task.id === pending.id && task.archivedAt !== undefined
                ? {
                    ...task,
                    archivedAt: undefined,
                    archiveReason: undefined,
                    updatedAt: timestamp,
                  }
                : task,
            ),
            lastDeletion: null,
          };
        case 'category': {
          // 削除後に同名カテゴリーが作られていたら、有効名の重複を避けて復元しない
          if (
            s.categories.some(
              (category) =>
                category.id !== pending.id &&
                category.archivedAt === undefined &&
                category.name === pending.label,
            )
          ) {
            return { lastDeletion: null };
          }
          const subCategoryIds = new Set(pending.subCategoryIds);
          return {
            categories: s.categories.map((category) =>
              category.id === pending.id && category.archivedAt !== undefined
                ? { ...category, archivedAt: undefined, updatedAt: timestamp }
                : category,
            ),
            subCategories: s.subCategories.map((subCategory) =>
              subCategoryIds.has(subCategory.id) && subCategory.archivedAt !== undefined
                ? { ...subCategory, archivedAt: undefined, updatedAt: timestamp }
                : subCategory,
            ),
            lastDeletion: null,
          };
        }
        case 'subCategory': {
          const target = s.subCategories.find((subCategory) => subCategory.id === pending.id);
          if (target === undefined) return { lastDeletion: null };
          if (
            s.subCategories.some(
              (subCategory) =>
                subCategory.id !== pending.id &&
                subCategory.categoryId === target.categoryId &&
                subCategory.archivedAt === undefined &&
                subCategory.name === pending.label,
            )
          ) {
            return { lastDeletion: null };
          }
          return {
            subCategories: s.subCategories.map((subCategory) =>
              subCategory.id === pending.id && subCategory.archivedAt !== undefined
                ? { ...subCategory, archivedAt: undefined, updatedAt: timestamp }
                : subCategory,
            ),
            lastDeletion: null,
          };
        }
        case 'recurrenceRule': {
          if (s.recurrenceRules.some((rule) => rule.id === pending.id)) {
            return { lastDeletion: null };
          }
          return {
            recurrenceRules: [...s.recurrenceRules, pending.rule],
            tasks: s.tasks.map((task) =>
              task.recurrenceId === pending.id &&
              task.archiveReason === 'rule' &&
              task.archivedAt === pending.deletedAt
                ? {
                    ...task,
                    archivedAt: undefined,
                    archiveReason: undefined,
                    updatedAt: timestamp,
                  }
                : task,
            ),
            lastDeletion: null,
          };
        }
      }
    }),

  dismissLastDeletion: () => set({ lastDeletion: null }),

  ensureRecurringOccurrencesForWeek: (weekStart) =>
    set((s) => {
      if (!isValidDateKey(weekStart)) return s;
      let tasks = s.tasks;
      const timestamp = nowIso();
      for (const rule of s.recurrenceRules) {
        if (!rule.isActive) continue;
        tasks = generateOccurrencesForWeek(rule, tasks, weekStart, timestamp);
      }
      return tasks === s.tasks ? s : { tasks };
    }),

  startSession: (taskId, destinationId, characterIds) => {
    const { activeSession, tasks, sessionHistory, restSession, characters, supportEvents } = get();
    if (activeSession !== null) return; // 同時進行は1件まで（仮仕様）
    const task = tasks.find(
      (t) => t.id === taskId && t.archivedAt === undefined && t.status === 'planned',
    );
    if (task === undefined) return;
    if (characterIds.length === 0) return;
    const startedAt = nowIso();
    const session: WorkSession = {
      id: newId('session'),
      taskId,
      startedAt,
      firstStartedAt: startedAt,
      accumulatedSeconds: 0,
      pausedAt: undefined,
      state: 'running',
      timerMode: task.timerMode === 'stopwatch' ? 'stopwatch' : 'estimate',
      destinationId,
      assignedCharacterIds: characterIds,
      taskTitleSnapshot: task.title,
      categoryIdSnapshot: task.categoryId,
      categoryNameSnapshot: task.category,
      subCategoryIdSnapshot: task.subCategoryId,
      subCategoryNameSnapshot: task.subCategoryName ?? task.subject,
    };
    const previousSession = sessionHistory[0];
    const encourage = isConsecutiveWork({
      previousSessionEndedAt: previousSession?.endedAt,
      nowMs: Date.parse(startedAt),
      restSession,
    });
    const nextSupportEvents = encourage
      ? appendSupportEvent(
          supportEvents,
          createSupportEvent(
            'consecutive-work',
            pickSupportCharacterId(previousSession, characters),
            previousSession?.id,
            startedAt,
          ),
        )
      : supportEvents;
    set((s) => ({
      activeSession: session,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: 'active' as const } : t)),
      // 休憩中に次の作業を始めた場合は、休憩を切り上げたものとして扱う
      restSession: s.restSession?.state === 'active' ? null : s.restSession,
      supportEvents: nextSupportEvents,
    }));
  },

  pauseSession: () => {
    const { activeSession } = get();
    if (activeSession === null || activeSession.state !== 'running') return;
    set({ activeSession: { ...activeSession, state: 'paused', pausedAt: nowIso() } });
  },

  resumeSession: () => {
    const { activeSession } = get();
    if (activeSession === null || activeSession.state !== 'paused') return;
    const pausedMs = activeSession.pausedAt !== undefined ? Date.parse(activeSession.pausedAt) : NaN;
    const startedMs = Date.parse(activeSession.startedAt);
    const additional = Number.isFinite(pausedMs) ? Math.max(0, (pausedMs - startedMs) / 1000) : 0;
    set({
      activeSession: {
        ...activeSession,
        state: 'running',
        startedAt: nowIso(),
        accumulatedSeconds: activeSession.accumulatedSeconds + additional,
        pausedAt: undefined,
      },
    });
  },

  finishSession: () => {
    const s = get();
    const { activeSession } = s;
    if (activeSession === null) return null;
    const settlement = settleSession(s, activeSession, 'completed', Date.now());
    if (settlement === null) {
      set({ activeSession: null });
      return null;
    }
    const { record, taskRewardResult, finished, endedAt } = settlement;
    const gainedExp = record.finalReward.experience;
    const dispatched = new Set(activeSession.assignedCharacterIds);
    set((prev) => {
      const applied = applyTaskRewardToState(
        prev,
        taskRewardResult.reward,
        record.finalReward.materials,
      );
      return {
        activeSession: null,
        sessionHistory: [finished, ...prev.sessionHistory],
        interruptedQuests: prev.interruptedQuests.filter(
          (quest) => quest.taskId !== activeSession.taskId,
        ),
        tasks: prev.tasks.map((t) =>
          t.id === activeSession.taskId
            ? { ...t, status: 'completed' as const, updatedAt: endedAt }
            : t,
        ),
        inventory: applied.inventory,
        itemInventory: applied.itemInventory,
        itemHistory: applied.itemHistory.slice(0, BALANCE.maxItemHistory),
        taskRewards: [applied.reward, ...prev.taskRewards].slice(0, BALANCE.maxTaskRewards),
        stardustCarry: taskRewardResult.stardustCarry,
        characters: prev.characters.map((c) =>
          dispatched.has(c.definitionId) ? applyExperienceToCharacter(c, gainedExp) : c,
        ),
        rewards: [record, ...prev.rewards],
        appliedRewardSessionIds: [...prev.appliedRewardSessionIds, activeSession.id],
      };
    });
    return record.id;
  },

  interruptSession: () => {
    const s = get();
    const { activeSession } = s;
    if (activeSession === null) return null;
    const nowMs = Date.now();
    const settlement = settleSession(s, activeSession, 'interrupted', nowMs);
    if (settlement === null) {
      const endedAt = new Date(nowMs).toISOString();
      const elapsed = sessionElapsedSeconds(activeSession, nowMs);
      const quest = buildInterruptedQuest(activeSession, elapsed, endedAt);
      set((prev) => ({
        activeSession: null,
        interruptedQuests: [
          ...prev.interruptedQuests.filter((q) => q.taskId !== activeSession.taskId),
          quest,
        ],
        tasks: prev.tasks.map((t) =>
          t.id === activeSession.taskId
            ? { ...t, status: 'interrupted' as const, updatedAt: endedAt }
            : t,
        ),
      }));
      return null;
    }
    const { record, taskRewardResult, finished, endedAt, elapsed } = settlement;
    const quest = buildInterruptedQuest(activeSession, elapsed, endedAt);
    const gainedExp = record.finalReward.experience;
    const dispatched = new Set(activeSession.assignedCharacterIds);
    set((prev) => {
      const applied = applyTaskRewardToState(
        prev,
        taskRewardResult.reward,
        record.finalReward.materials,
      );
      return {
        activeSession: null,
        sessionHistory: [finished, ...prev.sessionHistory],
        interruptedQuests: [
          ...prev.interruptedQuests.filter((q) => q.taskId !== activeSession.taskId),
          quest,
        ],
        tasks: prev.tasks.map((t) =>
          t.id === activeSession.taskId
            ? { ...t, status: 'interrupted' as const, updatedAt: endedAt }
            : t,
        ),
        inventory: applied.inventory,
        itemInventory: applied.itemInventory,
        itemHistory: applied.itemHistory.slice(0, BALANCE.maxItemHistory),
        taskRewards: [applied.reward, ...prev.taskRewards].slice(0, BALANCE.maxTaskRewards),
        stardustCarry: taskRewardResult.stardustCarry,
        characters: prev.characters.map((c) =>
          dispatched.has(c.definitionId) ? applyExperienceToCharacter(c, gainedExp) : c,
        ),
        rewards: [record, ...prev.rewards],
        appliedRewardSessionIds: [...prev.appliedRewardSessionIds, activeSession.id],
      };
    });
    return record.id;
  },

  resumeInterruptedQuest: (id) => {
    const s = get();
    if (s.activeSession !== null) return;
    const quest = s.interruptedQuests.find((q) => q.id === id);
    if (quest === undefined) return;
    const task = s.tasks.find(
      (t) => t.id === quest.taskId && t.archivedAt === undefined && t.status === 'interrupted',
    );
    if (task === undefined) return;
    const startedAt = nowIso();
    const session: WorkSession = {
      id: newId('session'),
      taskId: quest.taskId,
      startedAt,
      firstStartedAt: quest.firstStartedAt,
      accumulatedSeconds: 0,
      carriedSeconds: quest.elapsedSeconds,
      pausedAt: undefined,
      state: 'running',
      timerMode: quest.timerMode,
      destinationId: quest.destinationId,
      assignedCharacterIds: quest.assignedCharacterIds,
      taskTitleSnapshot: quest.taskTitleSnapshot ?? task.title,
      categoryIdSnapshot: quest.categoryIdSnapshot ?? task.categoryId,
      categoryNameSnapshot: quest.categoryNameSnapshot ?? task.category,
      subCategoryIdSnapshot: quest.subCategoryIdSnapshot ?? task.subCategoryId,
      subCategoryNameSnapshot: quest.subCategoryNameSnapshot ?? task.subCategoryName ?? task.subject,
    };
    set((prev) => ({
      activeSession: session,
      interruptedQuests: prev.interruptedQuests.filter((q) => q.id !== id),
      tasks: prev.tasks.map((t) =>
        t.id === quest.taskId ? { ...t, status: 'active' as const, updatedAt: startedAt } : t,
      ),
      restSession: prev.restSession?.state === 'active' ? null : prev.restSession,
    }));
  },

  discardInterruptedQuest: (id) => {
    const s = get();
    const quest = s.interruptedQuests.find((q) => q.id === id);
    if (quest === undefined) return;
    const timestamp = nowIso();
    set((prev) => ({
      interruptedQuests: prev.interruptedQuests.filter((q) => q.id !== id),
      tasks: prev.tasks.map((t) =>
        t.id === quest.taskId && t.status === 'interrupted'
          ? { ...t, status: 'planned' as const, updatedAt: timestamp }
          : t,
      ),
    }));
  },

  cancelSession: () => {
    const { activeSession } = get();
    if (activeSession === null) return;
    set((s) => ({
      activeSession: null,
      tasks: s.tasks.map((t) =>
        t.id === activeSession.taskId && t.status === 'active'
          ? { ...t, status: 'planned' as const, updatedAt: nowIso() }
          : t,
      ),
    }));
  },

  startRest: (plannedMinutes, sourceSessionId) => {
    const { sessionHistory } = get();
    const startedAt = nowIso();
    const source = sourceSessionId ?? sessionHistory[0]?.id;
    const rest: RestSession = {
      id: newId('rest'),
      startedAt,
      plannedMinutes: clampRestMinutes(plannedMinutes),
      sourceSessionId: source,
      state: 'active',
    };
    set({ restSession: rest });
  },

  completeRest: () => {
    const s = get();
    const rest = s.restSession;
    if (rest === null || !isRestDue(rest, Date.now())) return;
    const endedAt = nowIso();
    const source =
      rest.sourceSessionId !== undefined
        ? s.sessionHistory.find((session) => session.id === rest.sourceSessionId)
        : s.sessionHistory[0];
    const supporterId = pickSupportCharacterId(source, s.characters);
    const event = createSupportEvent('rest-complete', supporterId, source?.id, endedAt);
    set((prev) => ({
      restSession: { ...rest, state: 'completed', endedAt },
      supportEvents: appendSupportEvent(prev.supportEvents, event),
    }));
  },

  skipRest: () =>
    set((s) => (s.restSession?.state === 'active' ? { restSession: null } : s)),

  checkLongWorkSupport: () => {
    const s = get();
    const session = s.activeSession;
    if (session === null || session.state !== 'running') return;
    if (
      s.supportEvents.some(
        (event) => event.kind === 'long-work' && event.workSessionId === session.id,
      )
    ) {
      return;
    }
    const elapsed = sessionElapsedSeconds(session, Date.now());
    if (elapsed < BALANCE.longWorkSupportMinutes * 60) return;
    const createdAt = nowIso();
    const supporterId = pickSupportCharacterId(session, s.characters);
    const event = createSupportEvent('long-work', supporterId, session.id, createdAt);
    set((prev) => ({ supportEvents: appendSupportEvent(prev.supportEvents, event) }));
  },

  acknowledgeSupportEvent: (id) =>
    set((s) => ({
      supportEvents: s.supportEvents.map((event) =>
        event.id === id ? { ...event, seen: true } : event,
      ),
    })),

  levelUpCharacter: (definitionId) => {
    const s = get();
    const owned = s.characters.find((c) => c.definitionId === definitionId);
    if (owned === undefined) return false;
    const plan = planLevelUp(owned, s.itemInventory);
    if (!plan.canLevelUp) return false;
    const consumed = consumeItems(s.itemInventory, plan.items);
    if (!consumed.ok) return false;
    set((prev) => ({
      inventory: legacyInventoryFromItems(consumed.inventory, prev.inventory),
      itemInventory: consumed.inventory,
      itemHistory: [
        ...consumed.consumed.map((stack) =>
          createItemTransaction({
            id: newId('item'),
            itemId: stack.itemId,
            delta: -stack.quantity,
            reason: 'level_up',
            createdAt: nowIso(),
            characterId: definitionId,
          }),
        ),
        ...prev.itemHistory,
      ].slice(0, BALANCE.maxItemHistory),
      characters: prev.characters.map((c) =>
        c.definitionId === definitionId ? { ...c, level: c.level + 1 } : c,
      ),
    }));
    return true;
  },

  ascendCharacter: (definitionId) => {
    const s = get();
    const owned = s.characters.find((c) => c.definitionId === definitionId);
    if (owned === undefined) return false;
    const plan = planAscension(owned, s.itemInventory);
    if (!plan.canAscend || plan.nextStage === null) return false;
    const consumed = consumeItems(s.itemInventory, plan.items);
    if (!consumed.ok) return false;
    set((prev) => ({
      inventory: legacyInventoryFromItems(consumed.inventory, prev.inventory),
      itemInventory: consumed.inventory,
      itemHistory: [
        ...consumed.consumed.map((stack) =>
          createItemTransaction({
            id: newId('item'),
            itemId: stack.itemId,
            delta: -stack.quantity,
            reason: 'ascension',
            createdAt: nowIso(),
            characterId: definitionId,
          }),
        ),
        ...prev.itemHistory,
      ].slice(0, BALANCE.maxItemHistory),
      characters: prev.characters.map((c) => {
        if (c.definitionId !== definitionId) return c;
        const ascended = { ...c, ascensionStage: plan.nextStage ?? c.ascensionStage };
        return applyExperienceToCharacter(ascended, 0);
      }),
    }));
    return true;
  },

  upgradeFacility: (definitionId) => {
    const s = get();
    const owned = s.facilities.find((f) => f.definitionId === definitionId);
    if (owned === undefined) return false;
    const cost = facilityUpgradeCost(owned.level);
    const consumed = consumeItems(s.itemInventory, [
      { itemId: COIN_ITEM_ID, quantity: cost },
    ]);
    if (!consumed.ok) return false;
    set((prev) => ({
      inventory: legacyInventoryFromItems(consumed.inventory, prev.inventory),
      itemInventory: consumed.inventory,
      itemHistory: [
        createItemTransaction({
          id: newId('item'),
          itemId: COIN_ITEM_ID,
          delta: -cost,
          reason: 'other',
          createdAt: nowIso(),
        }),
        ...prev.itemHistory,
      ].slice(0, BALANCE.maxItemHistory),
      facilities: prev.facilities.map((f) =>
        f.definitionId === definitionId ? { ...f, level: f.level + 1 } : f,
      ),
    }));
    return true;
  },

  toggleFacility: (definitionId) =>
    set((s) => ({
      facilities: s.facilities.map((f) =>
        f.definitionId === definitionId ? { ...f, enabled: !f.enabled } : f,
      ),
    })),

  evaluateDueWeeks: (nowMs = Date.now()) => {
    const state = get();
    const now = new Date(nowMs);
    const currentWeek = weekStartKey(now);
    const lastDueWeek = previousWeekStartKey(currentWeek);
    const lastEvaluatedWeekStart = state.weeklyProgress?.lastEvaluatedWeekStart;
    const startWeek =
      typeof lastEvaluatedWeekStart === 'string' && isValidDateKey(lastEvaluatedWeekStart)
        ? nextWeekStartKey(lastEvaluatedWeekStart)
        : state.weeklyProgress?.trackingStartedWeek;

    if (startWeek === undefined || !isValidDateKey(startWeek)) return [];
    if (startWeek > lastDueWeek) return [];

    const existingWeeks = new Set(state.weeklyEvaluations.map((evaluation) => evaluation.weekStart));
    const created: WeeklyEvaluation[] = [];
    let tasks = state.tasks;
    let progress = state.weeklyProgress;
    const evaluatedAt = now.toISOString();

    for (const weekStart of enumerateWeekStarts(startWeek, lastDueWeek)) {
      // アプリを開かなかった週でも繰り返し予定を欠落させない
      for (const rule of state.recurrenceRules) {
        if (!rule.isActive) continue;
        tasks = generateOccurrencesForWeek(rule, tasks, weekStart, evaluatedAt);
      }

      if (existingWeeks.has(weekStart)) {
        progress = { ...progress, lastEvaluatedWeekStart: weekStart, updatedAt: evaluatedAt };
        continue;
      }

      const summary = summarizeWeek(tasks, weekStart);
      const status = decideWeekStatus(summary, state.restWeeks.includes(weekStart));
      const update = applyWeeklyStatus(progress, status, weekStart, evaluatedAt);
      const evaluation: WeeklyEvaluation = {
        id: `weekly-${weekStart}-${WEEKLY_USER_ID}`,
        userId: WEEKLY_USER_ID,
        weekStart,
        weekEnd: nextWeekStartKey(weekStart),
        status,
        eligibleTaskCount: summary.eligibleTaskCount,
        completedTaskCount: summary.completedTaskCount,
        completionRate: summary.completionRate,
        streakBefore: update.streakBefore,
        streakAfter: update.streakAfter,
        multiplierBefore: update.multiplierBefore,
        multiplierAfter: update.multiplierAfter,
        evaluatedAt,
        ruleVersion: WEEKLY_RULES.ruleVersion,
        taskIds: summary.taskIds,
      };
      created.push(evaluation);
      existingWeeks.add(weekStart);
      progress = update.progress;
    }

    if (created.length === 0 && tasks === state.tasks && progress === state.weeklyProgress) {
      return [];
    }

    set((prev) => ({
      tasks,
      weeklyProgress: progress,
      weeklyEvaluations: [...created.slice().reverse(), ...prev.weeklyEvaluations],
    }));
    return created;
  },

  toggleRestWeek: (weekStart) => {
    const state = get();
    if (!isValidDateKey(weekStart)) return false;
    const currentWeek = weekStartKey(new Date());
    if (weekStart < currentWeek) return false;
    if (state.weeklyEvaluations.some((evaluation) => evaluation.weekStart === weekStart)) {
      return false;
    }
    if (state.restWeeks.includes(weekStart)) {
      set((s) => ({ restWeeks: s.restWeeks.filter((week) => week !== weekStart) }));
      return true;
    }
    if (!isRestWeekAllowed(state.restWeeks, weekStart, currentWeek)) return false;
    set((s) => ({ restWeeks: [...s.restWeeks, weekStart].sort() }));
    return true;
  },

  importAppState: (raw) => {
    const result = parseBackup(raw);
    if (!result.ok) return result;
    set({
      ...result.state,
      hasHydrated: true,
      storageError: null,
      lastDeletion: null,
    });
    return result;
  },

  markBackupExported: (exportedAt) => {
    if (Number.isNaN(Date.parse(exportedAt))) return;
    set((s) => ({ settings: { ...s.settings, lastBackupAt: exportedAt } }));
  },

  setNavigationItemVisible: (id, visible) => {
    const current = get().settings.navigationItems;
    const next = setNavigationItemVisibleInList(current, id, visible);
    if (
      next.length === current.length &&
      next.every(
        (item, index) =>
          item.id === current[index]?.id && item.visible === current[index]?.visible,
      )
    ) {
      return;
    }
    set((s) => ({ settings: { ...s.settings, navigationItems: next } }));
  },

  moveNavigationItem: (id, direction) => {
    const current = get().settings.navigationItems;
    const next = moveNavigationItemInList(current, id, direction);
    if (
      next.length === current.length &&
      next.every((item, index) => item.id === current[index]?.id)
    ) {
      return;
    }
    set((s) => ({ settings: { ...s.settings, navigationItems: next } }));
  },

  resetNavigationItems: () => {
    set((s) => ({
      settings: { ...s.settings, navigationItems: createDefaultNavigationItems() },
    }));
  },

  resetAll: () => set({ ...initialAppState(), lastDeletion: null }),
  }));

  if (storage !== null) {
    store.subscribe((state) => {
      scheduleSave(state);
    });
  }

  return store;
}
