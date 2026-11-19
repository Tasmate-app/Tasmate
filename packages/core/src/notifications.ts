import type { NotificationSettings, Task } from '@tasmate/types';

import { NOTIFICATION_RULES } from './constants';
import { combineDateAndTime, isValidTime, taskScheduledDateKey } from './weekly';

export type TaskNotificationKind = 'task-start' | 'task-incomplete';

export interface TaskNotificationCandidate {
  identifier: string;
  kind: TaskNotificationKind;
  taskId: string;
  taskTitle: string;
  /** 通知対象の予定日（ローカル YYYY-MM-DD） */
  scheduledDate: string;
  /** 通知を出す時刻（ISO 8601） */
  triggerAt: string;
  title: string;
  body: string;
  data: {
    url: string;
    taskId: string;
    kind: TaskNotificationKind;
  };
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampDelayMinutes(value: number): number {
  const rounded = Math.floor(value);
  return Math.min(
    NOTIFICATION_RULES.maxDelayMinutes,
    Math.max(NOTIFICATION_RULES.minDelayMinutes, rounded),
  );
}

/** 通知設定の初期値。初回起動時から予定通知を有効にする */
export function createDefaultNotificationSettings(): NotificationSettings {
  return {
    enabled: true,
    taskStartEnabled: true,
    incompleteReminderEnabled: true,
    defaultStartTime: NOTIFICATION_RULES.defaultStartTime,
    incompleteDelayMinutes: NOTIFICATION_RULES.defaultDelayMinutes,
  };
}

/** 保存データの通知設定を補完・検証する */
export function normalizeNotificationSettings(value: unknown): NotificationSettings {
  const defaults = createDefaultNotificationSettings();
  if (!isRecord(value)) return defaults;

  const defaultStartTime = value['defaultStartTime'];
  const delay = value['incompleteDelayMinutes'];

  return {
    enabled: typeof value['enabled'] === 'boolean' ? value['enabled'] : defaults.enabled,
    taskStartEnabled:
      typeof value['taskStartEnabled'] === 'boolean'
        ? value['taskStartEnabled']
        : defaults.taskStartEnabled,
    incompleteReminderEnabled:
      typeof value['incompleteReminderEnabled'] === 'boolean'
        ? value['incompleteReminderEnabled']
        : defaults.incompleteReminderEnabled,
    defaultStartTime:
      typeof defaultStartTime === 'string' && isValidTime(defaultStartTime)
        ? defaultStartTime
        : defaults.defaultStartTime,
    incompleteDelayMinutes:
      typeof delay === 'number' && Number.isFinite(delay)
        ? clampDelayMinutes(delay)
        : defaults.incompleteDelayMinutes,
  };
}

function resolveStartTime(
  task: Task,
  settings: NotificationSettings,
): string {
  if (task.startTime !== undefined && isValidTime(task.startTime)) {
    return task.startTime;
  }
  return isValidTime(settings.defaultStartTime)
    ? settings.defaultStartTime
    : NOTIFICATION_RULES.defaultStartTime;
}

function buildIdentifier(
  kind: TaskNotificationKind,
  taskId: string,
  dateKey: string,
): string {
  return `${NOTIFICATION_RULES.identifierPrefix}${kind}:${taskId}:${dateKey}`;
}

/** このアプリが予約した予定クエスト通知か */
export function isTaskNotificationIdentifier(identifier: string): boolean {
  const prefix = `${NOTIFICATION_RULES.identifierPrefix}task-`;
  return identifier.startsWith(prefix);
}

/**
 * 予定クエストの通知候補を作る。
 *
 * #44: 開始予定時刻になったら通知（status が planned のみ）
 * #45: 開始予定時刻＋猶予を過ぎても未完了なら通知（planned / interrupted）
 *
 * 通知時刻が現在より前のものは、アプリ起動時に遡って通知しないため除外する。
 */
export function buildTaskNotificationCandidates(
  tasks: readonly Task[],
  settings: NotificationSettings,
  now: Date = new Date(),
): TaskNotificationCandidate[] {
  if (!settings.enabled) return [];

  const nowMs = now.getTime();
  const candidates: TaskNotificationCandidate[] = [];

  for (const task of tasks) {
    if (task.archivedAt !== undefined) continue;

    const dateKey = taskScheduledDateKey(task);
    if (dateKey === undefined) continue;

    const startTime = resolveStartTime(task, settings);
    const startAt = combineDateAndTime(dateKey, startTime);
    if (startAt === undefined) continue;
    const startMs = Date.parse(startAt);
    if (Number.isNaN(startMs)) continue;

    if (settings.taskStartEnabled && task.status === 'planned' && startMs > nowMs) {
      candidates.push({
        identifier: buildIdentifier('task-start', task.id, dateKey),
        kind: 'task-start',
        taskId: task.id,
        taskTitle: task.title,
        scheduledDate: dateKey,
        triggerAt: new Date(startMs).toISOString(),
        title: `クエスト開始: ${task.title}`,
        body: `予定時刻 ${startTime} です。クエストを始めましょう。`,
        data: { url: '/', taskId: task.id, kind: 'task-start' },
      });
    }

    if (
      !settings.incompleteReminderEnabled ||
      (task.status !== 'planned' && task.status !== 'interrupted')
    ) {
      continue;
    }

    const reminderMs =
      startMs + settings.incompleteDelayMinutes * 60_000;
    if (reminderMs <= nowMs) continue;

    candidates.push({
      identifier: buildIdentifier('task-incomplete', task.id, dateKey),
      kind: 'task-incomplete',
      taskId: task.id,
      taskTitle: task.title,
      scheduledDate: dateKey,
      triggerAt: new Date(reminderMs).toISOString(),
      title: `未完了のクエスト: ${task.title}`,
      body: `開始予定から${settings.incompleteDelayMinutes}分経過しました。まだ完了していません。`,
      data: { url: '/', taskId: task.id, kind: 'task-incomplete' },
    });
  }

  return candidates
    .sort((a, b) => {
      const diff = Date.parse(a.triggerAt) - Date.parse(b.triggerAt);
      return diff !== 0 ? diff : a.identifier.localeCompare(b.identifier);
    })
    .slice(0, NOTIFICATION_RULES.maxScheduledNotifications);
}
