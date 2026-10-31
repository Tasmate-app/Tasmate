import type {
  RewardBundle,
  Task,
  WeeklyEvaluationStatus,
  WeeklyProgress,
} from '@tasmate/types';
import { WEEKLY_RULES } from './constants';

/**
 * 週間カレンダー・週次判定・継続報酬の純粋ロジック。
 *
 * 日付はユーザーのローカルタイムゾーンで扱う。保存する日付キーは
 * YYYY-MM-DD（ローカル日付）、週の開始は WEEKLY_RULES.weekStartsOn（月曜）。
 * UTC とローカルを混在させないため、週の計算には必ずこのモジュールを使う。
 */

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;
const DAY_MS = 86_400_000;

export const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'] as const;

export type WeeklyRank = {
  id: string;
  name: string;
  minStreak: number;
  maxStreak: number;
  multiplier: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** ローカル日付を YYYY-MM-DD に変換する */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** YYYY-MM-DD をローカル日付へ変換する。形式不正は例外にする */
export function parseDateKey(key: string): Date {
  const match = DATE_KEY_PATTERN.exec(key);
  if (match === null) throw new Error(`不正な日付キーです: ${key}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (toDateKey(date) !== key) throw new Error(`存在しない日付です: ${key}`);
  return date;
}

/** 日付キーとして妥当か */
export function isValidDateKey(key: string): boolean {
  try {
    parseDateKey(key);
    return true;
  } catch {
    return false;
  }
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function addDaysToKey(key: string, days: number): string {
  return toDateKey(addDays(parseDateKey(key), days));
}

/** 月曜始まりなど、設定された曜日を週の先頭として日付を返す */
export function startOfWeek(
  date: Date,
  weekStartsOn: number = WEEKLY_RULES.weekStartsOn,
): Date {
  const weekday = weekdayNumber(date);
  const normalized = positiveModulo(weekday - weekStartsOn, 7);
  return addDays(startOfLocalDay(date), -normalized);
}

export function weekStartKey(date: Date): string {
  return toDateKey(startOfWeek(date));
}

export function weekStartKeyFromDateKey(key: string): string {
  return weekStartKey(parseDateKey(key));
}

/** 週の終了（翌週月曜 00:00）。この時刻は対象週に含めない */
export function weekEndExclusiveKey(weekStart: string): string {
  return addDaysToKey(weekStart, 7);
}

/** 週初めの月曜から7日分のローカル日付 */
export function getWeekDates(weekStart: string): Date[] {
  const start = parseDateKey(weekStart);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** 1=月曜 … 7=日曜 */
export function weekdayNumber(date: Date): number {
  return date.getDay() === 0 ? 7 : date.getDay();
}

export function isDateKeyInWeek(dateKey: string, weekStart: string): boolean {
  return dateKey >= weekStart && dateKey < weekEndExclusiveKey(weekStart);
}

export function previousWeekStartKey(weekStart: string): string {
  return addDaysToKey(weekStart, -7);
}

export function nextWeekStartKey(weekStart: string): string {
  return addDaysToKey(weekStart, 7);
}

/** start から end まで（両端含む）の週初めを列挙する */
export function enumerateWeekStarts(start: string, end: string): string[] {
  const result: string[] = [];
  let current = start;
  let guard = 0;
  while (current <= end && guard < WEEKLY_RULES.maxCatchUpWeeks) {
    result.push(current);
    current = nextWeekStartKey(current);
    guard += 1;
  }
  return result;
}

export function formatWeekRange(weekStart: string): string {
  const dates = getWeekDates(weekStart);
  const first = dates[0];
  const last = dates[6];
  const firstLabel = `${first.getMonth() + 1}月${first.getDate()}日`;
  const lastLabel = `${last.getMonth() + 1}月${last.getDate()}日`;
  return `${firstLabel} 〜 ${lastLabel}`;
}

export function formatDateLabel(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return `${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAY_LABELS[weekdayNumber(date) - 1]}）`;
}

/** HH:mm を検証する */
export function isValidTime(value: string): boolean {
  const match = TIME_PATTERN.exec(value);
  if (match === null) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function timeToMinutes(value: string): number {
  const match = TIME_PATTERN.exec(value);
  if (match === null) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 開始・終了時刻の前後関係を検証する。同日予定のみ対応する */
export function isValidTimeRange(startTime?: string, endTime?: string): boolean {
  if (startTime === undefined && endTime === undefined) return true;
  if (startTime === undefined || endTime === undefined) return false;
  if (!isValidTime(startTime) || !isValidTime(endTime)) return false;
  return timeToMinutes(endTime) > timeToMinutes(startTime);
}

export function combineDateAndTime(dateKey: string, time?: string): string | undefined {
  if (time === undefined || !isValidTime(time)) return undefined;
  const date = parseDateKey(dateKey);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
  ).toISOString();
}

type WeeklyTaskLike = Pick<
  Task,
  'status' | 'createdAt' | 'scheduledDate' | 'scheduledAt' | 'archivedAt'
>;

/** タスクの予定日キー。scheduledDate を優先し、旧データは scheduledAt から補う */
export function taskScheduledDateKey(task: WeeklyTaskLike): string | undefined {
  if (task.scheduledDate !== undefined && isValidDateKey(task.scheduledDate)) {
    return task.scheduledDate;
  }
  if (task.scheduledAt !== undefined) {
    const date = new Date(task.scheduledAt);
    if (!Number.isNaN(date.getTime())) return toDateKey(date);
  }
  return undefined;
}

/**
 * 対象週の集計に含めるタスクか。
 * 削除（アーカイブ）による分母の操作を防ぐため、週の途中で作成・削除された
 * 未完了タスクだけを除外し、それ以外のアーカイブ済みタスクは分母に残す。
 */
export function isTaskEligibleForWeek(
  task: WeeklyTaskLike,
  weekStart: string,
): boolean {
  const dateKey = taskScheduledDateKey(task);
  if (dateKey === undefined || !isDateKeyInWeek(dateKey, weekStart)) return false;
  if (task.status === 'completed') return true;
  if (task.archivedAt === undefined) return true;

  const weekStartMs = parseDateKey(weekStart).getTime();
  const weekEndMs = parseDateKey(weekEndExclusiveKey(weekStart)).getTime();
  const createdMs = Date.parse(task.createdAt);
  const archivedMs = Date.parse(task.archivedAt);
  if (!Number.isFinite(createdMs) || !Number.isFinite(archivedMs)) return true;
  return !(createdMs >= weekStartMs && archivedMs < weekEndMs);
}

export interface WeekSummary {
  eligibleTaskCount: number;
  completedTaskCount: number;
  completionRate: number | null;
  taskIds: string[];
}

export function summarizeWeek(tasks: Task[], weekStart: string): WeekSummary {
  const eligible = tasks.filter((task) => isTaskEligibleForWeek(task, weekStart));
  const completed = eligible.filter((task) => task.status === 'completed');
  const eligibleCount = eligible.length;
  const completedCount = Math.min(completed.length, eligibleCount);
  return {
    eligibleTaskCount: eligibleCount,
    completedTaskCount: completedCount,
    completionRate: eligibleCount === 0 ? null : completedCount / eligibleCount,
    taskIds: eligible.map((task) => task.id),
  };
}

const ACHIEVEMENT_PERCENT = Math.round(WEEKLY_RULES.achievementThreshold * 100);

/** 達成率から週次判定を行う。0件は pending（判定保留） */
export function decideWeekStatus(
  summary: WeekSummary,
  isRestWeek: boolean,
): WeeklyEvaluationStatus {
  if (isRestWeek) return 'rest';
  if (summary.eligibleTaskCount === 0 || summary.completionRate === null) return 'pending';
  return summary.completedTaskCount * 100 >= ACHIEVEMENT_PERCENT * summary.eligibleTaskCount
    ? 'achieved'
    : 'missed';
}

/** 週間達成に必要な完了数（切り上げ） */
export function requiredCompletedTasks(eligibleTaskCount: number): number {
  if (eligibleTaskCount <= 0) return 0;
  return Math.ceil((eligibleTaskCount * ACHIEVEMENT_PERCENT) / 100);
}

export function rankForStreak(streak: number): WeeklyRank {
  const normalized = Math.max(0, Math.floor(streak));
  const rank =
    WEEKLY_RULES.ranks.find(
      (candidate) => normalized >= candidate.minStreak && normalized <= candidate.maxStreak,
    ) ?? WEEKLY_RULES.ranks[0];
  return {
    id: rank.id,
    name: rank.name,
    minStreak: rank.minStreak,
    maxStreak: rank.maxStreak,
    multiplier: rank.multiplier,
  };
}

export function multiplierForStreak(streak: number): number {
  return rankForStreak(streak).multiplier;
}

/** 1つ上のランク。最上位なら null */
export function nextRankForStreak(streak: number): WeeklyRank | null {
  const current = rankForStreak(streak);
  return WEEKLY_RULES.ranks.find((rank) => rank.minStreak > current.minStreak) === undefined
    ? null
    : rankForStreak(current.maxStreak + 1);
}

export function evaluateStreakChange(
  streak: number,
  status: WeeklyEvaluationStatus,
): number {
  switch (status) {
    case 'achieved':
      return Math.max(0, streak) + 1;
    case 'missed':
      return Math.max(0, streak - 1);
    case 'pending':
    case 'rest':
      return Math.max(0, streak);
  }
}

export interface WeeklyProgressUpdate {
  progress: WeeklyProgress;
  streakBefore: number;
  streakAfter: number;
  multiplierBefore: number;
  multiplierAfter: number;
}

export function applyWeeklyStatus(
  progress: WeeklyProgress,
  status: WeeklyEvaluationStatus,
  evaluatedWeekStart: string,
  nowIso: string,
): WeeklyProgressUpdate {
  const streakBefore = progress.currentStreak;
  const multiplierBefore = multiplierForStreak(streakBefore);
  const streakAfter = evaluateStreakChange(streakBefore, status);
  const totalSuccessfulWeeks =
    status === 'achieved'
      ? progress.totalSuccessfulWeeks + 1
      : progress.totalSuccessfulWeeks;
  const highestStreak = Math.max(progress.highestStreak, streakAfter);
  return {
    progress: {
      ...progress,
      currentStreak: streakAfter,
      totalSuccessfulWeeks,
      highestStreak,
      lastEvaluatedWeekStart: evaluatedWeekStart,
      updatedAt: nowIso,
    },
    streakBefore,
    streakAfter,
    multiplierBefore,
    multiplierAfter: multiplierForStreak(streakAfter),
  };
}

export function emptyWeeklyProgress(now: Date): WeeklyProgress {
  const currentWeek = weekStartKey(now);
  return {
    userId: 'local-user',
    trackingStartedWeek: currentWeek,
    currentStreak: 0,
    totalSuccessfulWeeks: 0,
    highestStreak: 0,
    lastEvaluatedWeekStart: null,
    updatedAt: now.toISOString(),
  };
}

export interface RewardMultiplierChannels {
  currency: boolean;
  materials: boolean;
  experience: boolean;
}

const DEFAULT_REWARD_CHANNELS: RewardMultiplierChannels =
  WEEKLY_RULES.rewardMultiplier.channels;

/**
 * タスク完了報酬へ継続倍率を適用する。端数は切り捨て。
 * 適用対象は設定で明示されたチャネルのみ。
 */
export function applyRewardMultiplier(
  bundle: RewardBundle,
  multiplier: number,
  channels: RewardMultiplierChannels = DEFAULT_REWARD_CHANNELS,
): RewardBundle {
  const safeMultiplier = Number.isFinite(multiplier) ? Math.max(0, multiplier) : 1;
  const materials: RewardBundle['materials'] = {};
  for (const [id, amount] of Object.entries(bundle.materials)) {
    if (!channels.materials) {
      materials[id as keyof typeof materials] = amount;
      continue;
    }
    materials[id as keyof typeof materials] = Math.floor((amount ?? 0) * safeMultiplier);
  }
  return {
    currency: channels.currency ? Math.floor(bundle.currency * safeMultiplier) : bundle.currency,
    materials,
    experience: channels.experience
      ? Math.floor(bundle.experience * safeMultiplier)
      : bundle.experience,
  };
}

export function formatPercent(rate: number | null): string {
  if (rate === null) return '—';
  return `${Math.round(rate * 100)}%`;
}

/** 週次判定の表示ラベル */
export function weeklyStatusLabel(status: WeeklyEvaluationStatus): string {
  switch (status) {
    case 'achieved':
      return '週間達成';
    case 'missed':
      return '未達成';
    case 'rest':
      return '休息週';
    case 'pending':
      return '判定保留';
  }
}

/** 休息週の連続利用可否を判定する */
export function isRestWeekAllowed(
  restWeeks: string[],
  weekStart: string,
  evaluationEndedBefore: string,
): boolean {
  if (!WEEKLY_RULES.restWeek.enabled) return false;
  if (weekStart < evaluationEndedBefore) return false;
  let consecutive = 1;
  let cursor = previousWeekStartKey(weekStart);
  while (restWeeks.includes(cursor)) {
    consecutive += 1;
    if (consecutive > WEEKLY_RULES.restWeek.maxConsecutiveWeeks) return false;
    cursor = previousWeekStartKey(cursor);
  }
  return true;
}

export function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export { DAY_MS };
