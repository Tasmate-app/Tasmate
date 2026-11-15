import type {
  Category,
  CategoryTimeTotal,
  HistoryEntry,
  HistoryFilter,
  HistoryGranularity,
  SubCategory,
  SubCategoryTimeTotal,
  TimeSeriesPoint,
  WorkSession,
  WorkTimeTotals,
} from '@tasmate/types';
import { addDays, parseDateKey, startOfWeek, toDateKey, weekStartKey } from './weekly';

/**
 * 作業履歴の集計（純粋関数）。
 * - 対象は終了済みセッションのみ
 * - 時間は予定ではなく一時停止を除いた実作業秒
 * - 作業日はセッションを最初に開始したローカル日付
 */

const UNCATEGORIZED = '未分類';

/** 一時停止を除いた実作業秒数。未終了セッションは 0 */
export function sessionWorkSeconds(session: WorkSession): number {
  const startedMs = Date.parse(session.startedAt);
  if (!Number.isFinite(startedMs)) return 0;
  const effectiveEnd =
    session.pausedAt !== undefined
      ? Date.parse(session.pausedAt)
      : session.endedAt !== undefined
        ? Date.parse(session.endedAt)
        : NaN;
  if (!Number.isFinite(effectiveEnd)) return 0;
  const base = Math.max(0, session.accumulatedSeconds);
  return base + Math.max(0, (effectiveEnd - startedMs) / 1000);
}

/** セッションの作業日キー（YYYY-MM-DD）。開始時刻を基準にする */
export function sessionDateKey(session: WorkSession): string | null {
  const source = session.firstStartedAt ?? session.startedAt;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return null;
  return toDateKey(date);
}

export type SessionHistoryKind = 'completed' | 'interrupted' | 'in-progress';

export function classifySession(session: WorkSession): SessionHistoryKind {
  if (session.endedAt === undefined) return 'in-progress';
  return session.result === 'completed' ? 'completed' : 'interrupted';
}

/**
 * セッションを履歴エントリへ変換する。
 * スナップショットが無い旧データは現在のタスク情報で補完する。
 */
export function buildHistoryEntries(
  sessions: readonly WorkSession[],
  tasks: readonly { id: string; title: string; category?: string; categoryId?: string; subject?: string; subCategoryId?: string; subCategoryName?: string }[],
  categories: readonly Category[],
  subCategories: readonly SubCategory[],
): HistoryEntry[] {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const subCategoryById = new Map(subCategories.map((sub) => [sub.id, sub]));
  const entries: HistoryEntry[] = [];

  for (const session of sessions) {
    if (session.endedAt === undefined) continue;
    const dateKey = sessionDateKey(session);
    if (dateKey === null) continue;
    const task = taskById.get(session.taskId);

    const categoryId = session.categoryIdSnapshot ?? task?.categoryId ?? null;
    const categoryFromMaster = categoryId !== null ? categoryById.get(categoryId) : undefined;
    const categoryName =
      session.categoryNameSnapshot ??
      categoryFromMaster?.name ??
      (task?.category !== undefined && task.category.trim() !== '' ? task.category : UNCATEGORIZED);

    const subCategoryId = session.subCategoryIdSnapshot ?? task?.subCategoryId ?? null;
    const subFromMaster = subCategoryId !== null ? subCategoryById.get(subCategoryId) : undefined;
    const subCategoryName =
      session.subCategoryNameSnapshot ??
      subFromMaster?.name ??
      (task?.subCategoryName !== undefined && task.subCategoryName.trim() !== ''
        ? task.subCategoryName
        : undefined) ??
      (task?.subject !== undefined && task.subject.trim() !== '' ? task.subject : null);

    entries.push({
      sessionId: session.id,
      taskId: session.taskId,
      taskTitle: session.taskTitleSnapshot ?? task?.title ?? 'タスク',
      startedAt: session.firstStartedAt ?? session.startedAt,
      endedAt: session.endedAt,
      dateKey,
      categoryId,
      categoryName,
      categoryArchived: categoryFromMaster?.archivedAt !== undefined,
      subCategoryId,
      subCategoryName,
      subCategoryArchived: subFromMaster?.archivedAt !== undefined,
      durationSeconds: sessionWorkSeconds(session),
      result: session.result ?? null,
      completed: session.result === 'completed',
    });
  }

  return entries.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export function filterHistoryEntries(
  entries: readonly HistoryEntry[],
  filter: HistoryFilter,
): HistoryEntry[] {
  return entries.filter((entry) => {
    if (filter.fromDateKey !== undefined && entry.dateKey < filter.fromDateKey) return false;
    if (filter.toDateKey !== undefined && entry.dateKey > filter.toDateKey) return false;
    if (filter.categoryId !== undefined && entry.categoryId !== filter.categoryId) return false;
    if (filter.subCategoryId !== undefined && entry.subCategoryId !== filter.subCategoryId) {
      return false;
    }
    return true;
  });
}

/** 期間内（両端を含む）のエントリ */
export function entriesInPeriod(
  entries: readonly HistoryEntry[],
  fromDateKey: string,
  toDateKeyValue: string,
): HistoryEntry[] {
  return filterHistoryEntries(entries, {
    fromDateKey,
    toDateKey: toDateKeyValue,
  });
}

/**
 * 今日・今週（月曜始まり）・今月・累計の実作業時間を集計する。
 */
export function computeWorkTimeTotals(
  entries: readonly HistoryEntry[],
  now: Date = new Date(),
): WorkTimeTotals {
  const todayKey = toDateKey(now);
  const weekStart = weekStartKey(now);
  const weekEndExclusive = toDateKey(addDays(parseDateKey(weekStart), 7));
  const monthPrefix = todayKey.slice(0, 7);
  const totals: WorkTimeTotals = { today: 0, week: 0, month: 0, total: 0 };

  for (const entry of entries) {
    const seconds = Math.max(0, entry.durationSeconds);
    totals.total += seconds;
    if (entry.dateKey === todayKey) totals.today += seconds;
    if (entry.dateKey >= weekStart && entry.dateKey < weekEndExclusive) totals.week += seconds;
    if (entry.dateKey.slice(0, 7) === monthPrefix) totals.month += seconds;
  }
  return totals;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function pointLabel(key: string, granularity: HistoryGranularity): string {
  if (granularity === 'year') return `${key}年`;
  if (granularity === 'month') {
    const [, month] = key.split('-');
    return `${Number(month)}月`;
  }
  const date = parseDateKey(key);
  if (Number.isNaN(date.getTime())) return key;
  return granularity === 'week'
    ? `${date.getMonth() + 1}/${date.getDate()}週`
    : `${date.getMonth() + 1}/${date.getDate()}`;
}

function bucketKey(dateKey: string, granularity: HistoryGranularity): string {
  if (granularity === 'year') return dateKey.slice(0, 4);
  if (granularity === 'month') return dateKey.slice(0, 7);
  if (granularity === 'week') return weekStartKey(parseDateKey(dateKey));
  return dateKey;
}

/**
 * 推移グラフ用の系列を作る。`endDateKey` を含むバケットから過去 `count` 個を返す。
 */
export function buildTimeSeries(
  entries: readonly HistoryEntry[],
  granularity: HistoryGranularity,
  endDateKey: string,
  count: number,
): TimeSeriesPoint[] {
  const safeCount = Math.max(1, Math.floor(count));
  const endKey = bucketKey(endDateKey, granularity);
  const keys: string[] = [endKey];
  for (let i = 1; i < safeCount; i += 1) {
    const previous = keys[0] ?? endKey;
    const startDate =
      granularity === 'week'
        ? addDays(parseDateKey(previous), -7)
        : granularity === 'month'
          ? new Date(Number(previous.slice(0, 4)), Number(previous.slice(5, 7)) - 2, 1)
          : granularity === 'year'
            ? new Date(Number(previous) - 1, 0, 1)
            : addDays(parseDateKey(previous), -1);
    keys.unshift(granularity === 'month' ? monthKey(startDate) : bucketKey(toDateKey(startDate), granularity));
  }

  const secondsByKey = new Map<string, number>();
  for (const entry of entries) {
    const key = bucketKey(entry.dateKey, granularity);
    secondsByKey.set(key, (secondsByKey.get(key) ?? 0) + Math.max(0, entry.durationSeconds));
  }

  return keys.map((key) => ({
    key,
    label: pointLabel(key, granularity),
    seconds: secondsByKey.get(key) ?? 0,
  }));
}

export interface HistoryWindow {
  fromDateKey: string;
  toDateKey: string;
}

/**
 * 推移グラフの表示範囲を日付キーの範囲へ変換する。
 * `buildTimeSeries` のバケット境界と揃え、現在の週・月・年は全体を含める。
 */
export function getHistoryWindow(
  granularity: HistoryGranularity,
  endDateKey: string,
  count: number,
): HistoryWindow {
  const safeCount = Math.max(1, Math.floor(count));
  const endDate = parseDateKey(endDateKey);
  switch (granularity) {
    case 'day':
      return {
        fromDateKey: toDateKey(addDays(endDate, -(safeCount - 1))),
        toDateKey: endDateKey,
      };
    case 'week': {
      const start = startOfWeek(endDate);
      return {
        fromDateKey: toDateKey(addDays(start, -7 * (safeCount - 1))),
        toDateKey: toDateKey(addDays(start, 6)),
      };
    }
    case 'month':
      return {
        fromDateKey: toDateKey(
          new Date(endDate.getFullYear(), endDate.getMonth() - (safeCount - 1), 1),
        ),
        toDateKey: toDateKey(new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0)),
      };
    case 'year':
      return {
        fromDateKey: toDateKey(new Date(endDate.getFullYear() - (safeCount - 1), 0, 1)),
        toDateKey: toDateKey(new Date(endDate.getFullYear(), 11, 31)),
      };
  }
}

/** カテゴリー別の実作業時間。未分類は categoryId=null にまとめる */
export function aggregateByCategory(entries: readonly HistoryEntry[]): CategoryTimeTotal[] {
  const grouped = new Map<string, CategoryTimeTotal>();
  let total = 0;
  for (const entry of entries) {
    const seconds = Math.max(0, entry.durationSeconds);
    if (seconds === 0) continue;
    total += seconds;
    const key = entry.categoryId ?? `name:${entry.categoryName}`;
    const current = grouped.get(key);
    if (current === undefined) {
      grouped.set(key, {
        categoryId: entry.categoryId,
        categoryName: entry.categoryName,
        seconds,
        ratio: 0,
        archived: entry.categoryArchived,
      });
    } else {
      current.seconds += seconds;
      current.archived = current.archived || entry.categoryArchived;
    }
  }
  return [...grouped.values()]
    .map((item) => ({ ...item, ratio: total > 0 ? item.seconds / total : 0 }))
    .sort((a, b) => b.seconds - a.seconds);
}

/** サブカテゴリー別の実作業時間。未設定は「未分類」にまとめる */
export function aggregateBySubCategory(
  entries: readonly HistoryEntry[],
  categoryId?: string,
): SubCategoryTimeTotal[] {
  const grouped = new Map<string, SubCategoryTimeTotal>();
  let total = 0;
  for (const entry of entries) {
    if (categoryId !== undefined && entry.categoryId !== categoryId) continue;
    const seconds = Math.max(0, entry.durationSeconds);
    if (seconds === 0) continue;
    total += seconds;
    const key = entry.subCategoryId ?? `name:${entry.subCategoryName ?? ''}`;
    const current = grouped.get(key);
    if (current === undefined) {
      grouped.set(key, {
        subCategoryId: entry.subCategoryId,
        subCategoryName: entry.subCategoryName ?? UNCATEGORIZED,
        seconds,
        ratio: 0,
        archived: entry.subCategoryArchived,
      });
    } else {
      current.seconds += seconds;
      current.archived = current.archived || entry.subCategoryArchived;
    }
  }
  return [...grouped.values()]
    .map((item) => ({ ...item, ratio: total > 0 ? item.seconds / total : 0 }))
    .sort((a, b) => b.seconds - a.seconds);
}

/** 実作業秒を「2時間15分」「45分」「1分未満」のように表示する */
export function formatWorkDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds === 0) return '0分';
  if (seconds < 60) return '1分未満';
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}分`;
  if (remainingMinutes === 0) return `${hours}時間`;
  return `${hours}時間${remainingMinutes}分`;
}

/** 月曜始まりの週開始キー（他画面との一貫性のため再公開） */
export { startOfWeek };
