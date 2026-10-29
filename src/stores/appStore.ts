import { create } from 'zustand';
import { elapsedSeconds } from '../domain/session';
import { experienceToNextLevel, levelUpCost } from '../domain/reward';
import { facilityUpgradeCost } from '../domain/facility';
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
} from '../domain/weekly';
import {
  buildOccurrenceTask,
  occurrenceDatesForWeek,
  occurrenceExists,
} from '../domain/recurrence';
import { BALANCE, WEEKLY_RULES } from '../domain/constants';
import {
  clampRestMinutes,
  isConsecutiveWork,
  isRestDue,
  supportMessage,
} from '../domain/rest';
import { initialAppState, type AppState } from '../services/appState';
import { loadAppState, saveAppState } from '../services/storage';
import { computeSessionReward } from '../services/rewardService';
import { CHARACTER_DEFINITIONS } from '../data/seed';
import type {
  OwnedCharacter,
  RecurrenceRule,
  RestSession,
  SessionResult,
  SupportEvent,
  SupportEventKind,
  Task,
  WeeklyEvaluation,
  WorkSession,
} from '../types/index';

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
  subject?: string;
  estimatedMinutes: number;
  scheduledAt?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
}

export interface RecurrenceRuleInput {
  title: string;
  description: string;
  category: string;
  subject?: string;
  estimatedMinutes: number;
  daysOfWeek: number[];
  startTime?: string;
  endTime?: string;
  effectiveFrom: string;
  effectiveUntil?: string;
}

interface AppActions {
  createTask: (input: TaskInput) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  createRecurrenceRule: (input: RecurrenceRuleInput) => string;
  updateRecurrenceRule: (id: string, patch: Partial<RecurrenceRuleInput>) => void;
  deleteRecurrenceRule: (id: string) => void;
  ensureRecurringOccurrencesForWeek: (weekStart: string) => void;

  startSession: (taskId: string, destinationId: string, characterIds: string[]) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  /** セッションを終了し報酬を確定する。戻り値は確定した報酬レコードの ID（報酬なしの場合 null） */
  finishSession: (result: SessionResult) => string | null;
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
  upgradeFacility: (definitionId: string) => boolean;
  toggleFacility: (definitionId: string) => void;

  /** 未判定の過去週を古い順に判定する。同じ週は再判定しない */
  evaluateDueWeeks: (nowMs?: number) => WeeklyEvaluation[];
  /** 休息週の設定を切り替える。設定できない場合は false */
  toggleRestWeek: (weekStart: string) => boolean;

  resetAll: () => void;
}

type AppStore = AppState & AppActions;

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
      subject: rule.subject,
      estimatedMinutes: rule.estimatedMinutes,
      startTime: rule.startTime,
      endTime: rule.endTime,
      scheduledAt: combineDateAndTime(dateKey, rule.startTime),
      updatedAt: nowIso(),
    };
  });
}

const persisted = loadAppState();

export const useAppStore = create<AppStore>()((set, get) => ({
  ...persisted,

  createTask: (input) => {
    const timestamp = nowIso();
    const title = input.title.trim();
    if (title.length === 0) return;
    const schedule = sanitizeSchedule(input.scheduledDate, input.startTime, input.endTime);
    if (schedule === null) return;
    const task: Task = {
      id: newId('task'),
      title,
      description: input.description.trim(),
      category: input.category.trim() === '' ? '勉強' : input.category.trim(),
      subject: input.subject?.trim() === '' ? undefined : input.subject?.trim(),
      estimatedMinutes: Math.max(1, Math.floor(input.estimatedMinutes) || 25),
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
  },

  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const merged: Task = { ...t, ...patch, updatedAt: nowIso() };
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
      // 進行中セッションのタスクは削除不可
      if (s.activeSession?.taskId === id) return s;
      const timestamp = nowIso();
      return {
        tasks: s.tasks.map((t) =>
          t.id === id
            ? { ...t, archivedAt: timestamp, archiveReason: 'user' as const, updatedAt: timestamp }
            : t,
        ),
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
    const rule: RecurrenceRule = {
      id: newId('rule'),
      title,
      description: input.description.trim(),
      category: input.category.trim() === '' ? '勉強' : input.category.trim(),
      subject: input.subject?.trim() === '' ? undefined : input.subject?.trim(),
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
        subject: 'subject' in patch ? patch.subject : current.subject,
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
      const updated: RecurrenceRule = {
        ...current,
        title: mergedInput.title.trim(),
        description: mergedInput.description.trim(),
        category:
          mergedInput.category.trim() === '' ? '勉強' : mergedInput.category.trim(),
        subject:
          mergedInput.subject?.trim() === '' ? undefined : mergedInput.subject?.trim(),
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
      const timestamp = nowIso();
      const todayKey = toDateKey(new Date());
      return {
        recurrenceRules: s.recurrenceRules.filter((rule) => rule.id !== id),
        tasks: s.tasks.map((task) =>
          task.recurrenceId === id &&
          task.status !== 'completed' &&
          task.archivedAt === undefined &&
          task.scheduledDate !== undefined &&
          task.scheduledDate >= todayKey
            ? { ...task, archivedAt: timestamp, archiveReason: 'rule' as const, updatedAt: timestamp }
            : task,
        ),
      };
    }),

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
      accumulatedSeconds: 0,
      pausedAt: undefined,
      state: 'running',
      destinationId,
      assignedCharacterIds: characterIds,
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

  finishSession: (result) => {
    const s = get();
    const { activeSession } = s;
    if (activeSession === null) return null;
    // 二重完了防止：同一セッションへの再確定を防ぐ
    if (s.appliedRewardSessionIds.includes(activeSession.id)) {
      set({ activeSession: null });
      return null;
    }
    const nowMs = Date.now();
    const elapsed = sessionElapsedSeconds(activeSession, nowMs);
    const endedAt = new Date(nowMs).toISOString();
    const finished: WorkSession = {
      ...activeSession,
      state: 'idle',
      result,
      endedAt,
    };
    const task = s.tasks.find((t) => t.id === activeSession.taskId);
    const record = computeSessionReward({
      session: finished,
      task,
      characters: s.characters,
      facilities: s.facilities,
      elapsedSec: elapsed,
      nowIso: endedAt,
      rewardMultiplier: currentWeeklyMultiplier(s),
    });

    // 報酬付与：通貨・素材・経験値
    const gainedExp = record.finalReward.experience;
    const dispatched = new Set(activeSession.assignedCharacterIds);
    set((prev) => ({
      activeSession: null,
      sessionHistory: [finished, ...prev.sessionHistory],
      tasks: prev.tasks.map((t) =>
        t.id === activeSession.taskId
          ? {
              ...t,
              status: result === 'completed' ? ('completed' as const) : ('planned' as const),
              updatedAt: endedAt,
            }
          : t,
      ),
      inventory: {
        currency: (prev.inventory?.currency ?? 0) + record.finalReward.currency,
        materials: {
          shard_sun:
            (prev.inventory?.materials?.shard_sun ?? 0) +
            (record.finalReward.materials.shard_sun ?? 0),
          shard_moon:
            (prev.inventory?.materials?.shard_moon ?? 0) +
            (record.finalReward.materials.shard_moon ?? 0),
          shard_star:
            (prev.inventory?.materials?.shard_star ?? 0) +
            (record.finalReward.materials.shard_star ?? 0),
        },
      },
      characters: prev.characters.map((c) =>
        dispatched.has(c.definitionId) ? { ...c, experience: c.experience + gainedExp } : c,
      ),
      rewards: [record, ...prev.rewards],
      appliedRewardSessionIds: [...prev.appliedRewardSessionIds, activeSession.id],
    }));
    return record.id;
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
    const cost = levelUpCost(owned.level);
    if (s.inventory.currency < cost) return false;
    if (owned.experience < experienceToNextLevel(owned.level)) return false;
    set((prev) => ({
      inventory: { ...prev.inventory, currency: prev.inventory.currency - cost },
      characters: prev.characters.map((c) =>
        c.definitionId === definitionId
          ? {
              ...c,
              level: c.level + 1,
              experience: c.experience - experienceToNextLevel(c.level),
            }
          : c,
      ),
    }));
    return true;
  },

  upgradeFacility: (definitionId) => {
    const s = get();
    const owned = s.facilities.find((f) => f.definitionId === definitionId);
    if (owned === undefined) return false;
    const cost = facilityUpgradeCost(owned.level);
    if (s.inventory.currency < cost) return false;
    set((prev) => ({
      inventory: { ...prev.inventory, currency: prev.inventory.currency - cost },
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
    const startWeek =
      state.weeklyProgress.lastEvaluatedWeekStart !== null
        ? nextWeekStartKey(state.weeklyProgress.lastEvaluatedWeekStart)
        : state.weeklyProgress.trackingStartedWeek;

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

  resetAll: () => set({ ...initialAppState() }),
}));

// 永続化：ストアの状態変更をサービス層経由で保存する
useAppStore.subscribe((state) => {
  const snapshot: AppState = {
    version: 1,
    tasks: state.tasks,
    activeSession: state.activeSession,
    sessionHistory: state.sessionHistory,
    inventory: state.inventory,
    characters: state.characters,
    facilities: state.facilities,
    rewards: state.rewards,
    appliedRewardSessionIds: state.appliedRewardSessionIds,
    recurrenceRules: state.recurrenceRules,
    weeklyEvaluations: state.weeklyEvaluations,
    weeklyProgress: state.weeklyProgress,
    restWeeks: state.restWeeks,
    restSession: state.restSession,
    supportEvents: state.supportEvents,
  };
  saveAppState(snapshot);
});
