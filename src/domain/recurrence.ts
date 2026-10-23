import type { RecurrenceRule, Task } from '../types/index';
import {
  addDaysToKey,
  combineDateAndTime,
  getWeekDates,
  isValidDateKey,
  parseDateKey,
  weekdayNumber,
  toDateKey,
} from './weekly';

/**
 * 繰り返しルールと個別予定（TaskOccurrence）の生成ロジック。
 * ルールと実績を分離し、生成済みの予定を重複作成しないことを保証する。
 */

export function ruleAppliesOnDate(rule: RecurrenceRule, dateKey: string): boolean {
  if (!rule.isActive || !isValidDateKey(dateKey)) return false;
  if (dateKey < rule.effectiveFrom) return false;
  if (rule.effectiveUntil !== undefined && dateKey > rule.effectiveUntil) return false;
  const weekday = weekdayNumber(parseDateKey(dateKey));
  return rule.daysOfWeek.includes(weekday);
}

/** 指定週に生成すべき予定日 */
export function occurrenceDatesForWeek(rule: RecurrenceRule, weekStart: string): string[] {
  return getWeekDates(weekStart)
    .map((date) => toDateKey(date))
    .filter((dateKey) => ruleAppliesOnDate(rule, dateKey));
}

/** 同じルール・同じ予定日のタスクが既に存在するか（削除済みも含む） */
export function occurrenceExists(
  tasks: Task[],
  ruleId: string,
  dateKey: string,
): boolean {
  return tasks.some(
    (task) =>
      task.recurrenceId === ruleId &&
      (task.scheduledDate === dateKey ||
        (task.scheduledDate === undefined && task.scheduledAt?.startsWith(dateKey) === true)),
  );
}

export function buildOccurrenceTask(
  rule: RecurrenceRule,
  dateKey: string,
  id: string,
  nowIso: string,
): Task {
  return {
    id,
    title: rule.title,
    description: rule.description,
    category: rule.category,
    subject: rule.subject,
    estimatedMinutes: rule.estimatedMinutes,
    scheduledDate: dateKey,
    startTime: rule.startTime,
    endTime: rule.endTime,
    scheduledAt: combineDateAndTime(dateKey, rule.startTime),
    recurrenceId: rule.id,
    status: 'planned',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/** 指定日以降で次にルールが適用される日（上限付き） */
export function nextOccurrenceDate(
  rule: RecurrenceRule,
  fromDateKey: string,
  maxDays = 366,
): string | undefined {
  let cursor = fromDateKey;
  for (let index = 0; index < maxDays; index += 1) {
    if (rule.effectiveUntil !== undefined && cursor > rule.effectiveUntil) return undefined;
    if (ruleAppliesOnDate(rule, cursor)) return cursor;
    cursor = addDaysToKey(cursor, 1);
  }
  return undefined;
}
