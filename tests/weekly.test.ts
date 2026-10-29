import { describe, expect, it } from 'vitest';
import type { RecurrenceRule, Task, WeeklyProgress } from '../src/types/index';
import {
  applyRewardMultiplier,
  applyWeeklyStatus,
  decideWeekStatus,
  emptyWeeklyProgress,
  evaluateStreakChange,
  isTaskEligibleForWeek,
  multiplierForStreak,
  rankForStreak,
  requiredCompletedTasks,
  startOfWeek,
  summarizeWeek,
  taskScheduledDateKey,
  toDateKey,
  weekEndExclusiveKey,
  weekStartKey,
} from '../src/domain/weekly';
import {
  buildOccurrenceTask,
  occurrenceDatesForWeek,
  occurrenceExists,
  ruleAppliesOnDate,
} from '../src/domain/recurrence';

const WEEK_START = '2026-10-19';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? 'task-1',
    title: 'テスト',
    description: '',
    category: '勉強',
    estimatedMinutes: 25,
    scheduledDate: WEEK_START,
    status: 'planned',
    createdAt: '2026-10-19T00:00:00.000Z',
    updatedAt: '2026-10-19T00:00:00.000Z',
    ...overrides,
  };
}

function makeTasks(total: number, completed: number): Task[] {
  return Array.from({ length: total }, (_, index) =>
    makeTask({
      id: `task-${index}`,
      status: index < completed ? 'completed' : 'planned',
      scheduledDate: `2026-10-${String(19 + (index % 7)).padStart(2, '0')}`,
    }),
  );
}

function makeProgress(overrides: Partial<WeeklyProgress> = {}): WeeklyProgress {
  return {
    userId: 'local-user',
    trackingStartedWeek: WEEK_START,
    currentStreak: 0,
    totalSuccessfulWeeks: 0,
    highestStreak: 0,
    lastEvaluatedWeekStart: null,
    updatedAt: '2026-10-19T00:00:00.000Z',
    ...overrides,
  };
}

describe('週間達成判定', () => {
  it('対象5件・完了4件は達成になる', () => {
    const summary = summarizeWeek(makeTasks(5, 4), WEEK_START);
    expect(summary.eligibleTaskCount).toBe(5);
    expect(summary.completedTaskCount).toBe(4);
    expect(decideWeekStatus(summary, false)).toBe('achieved');
  });

  it('対象10件・完了7件は未達成になる', () => {
    const summary = summarizeWeek(makeTasks(10, 7), WEEK_START);
    expect(decideWeekStatus(summary, false)).toBe('missed');
  });

  it('対象0件は達成率100%にせず判定保留にする', () => {
    const summary = summarizeWeek([], WEEK_START);
    expect(summary.completionRate).toBeNull();
    expect(summary.eligibleTaskCount).toBe(0);
    expect(decideWeekStatus(summary, false)).toBe('pending');
  });

  it('休息週は達成数・未達成のどちらにもしない', () => {
    const summary = summarizeWeek(makeTasks(5, 0), WEEK_START);
    expect(decideWeekStatus(summary, true)).toBe('rest');
  });

  it('達成に必要な完了数は切り上げで計算する', () => {
    expect(requiredCompletedTasks(5)).toBe(4);
    expect(requiredCompletedTasks(10)).toBe(8);
    expect(requiredCompletedTasks(0)).toBe(0);
  });
});

describe('継続週数と倍率', () => {
  it('4週連続達成後の未達成で3週・×1.20へ下がり、再達成で4週・×1.30へ戻る', () => {
    const before = makeProgress({ currentStreak: 4, highestStreak: 4, totalSuccessfulWeeks: 4 });
    expect(multiplierForStreak(4)).toBe(1.3);

    const missed = applyWeeklyStatus(before, 'missed', '2026-10-19', '2026-10-26T00:00:00.000Z');
    expect(missed.streakAfter).toBe(3);
    expect(missed.multiplierAfter).toBe(1.2);
    expect(missed.progress.totalSuccessfulWeeks).toBe(4);

    const recovered = applyWeeklyStatus(
      missed.progress,
      'achieved',
      '2026-10-26',
      '2026-11-02T00:00:00.000Z',
    );
    expect(recovered.streakAfter).toBe(4);
    expect(recovered.multiplierAfter).toBe(1.3);
    expect(recovered.progress.totalSuccessfulWeeks).toBe(5);
  });

  it('未達成で累計達成週数と最高連続達成週数は失われない', () => {
    const before = makeProgress({ currentStreak: 5, highestStreak: 5, totalSuccessfulWeeks: 9 });
    const update = applyWeeklyStatus(before, 'missed', '2026-10-19', '2026-10-26T00:00:00.000Z');
    expect(update.progress.totalSuccessfulWeeks).toBe(9);
    expect(update.progress.highestStreak).toBe(5);
  });

  it('判定保留・休息週は継続数を維持する', () => {
    expect(evaluateStreakChange(4, 'pending')).toBe(4);
    expect(evaluateStreakChange(4, 'rest')).toBe(4);
    expect(evaluateStreakChange(0, 'missed')).toBe(0);
  });

  it('倍率表の上限は×1.75', () => {
    expect(rankForStreak(8).multiplier).toBe(1.75);
    expect(rankForStreak(99).multiplier).toBe(1.75);
    expect(multiplierForStreak(0)).toBe(1);
  });
});

describe('週の境界と日付', () => {
  it('月曜00:00から翌週月曜00:00直前までを同じ週として扱う', () => {
    const monday = new Date(2026, 9, 19, 0, 0, 0);
    const sunday = new Date(2026, 9, 25, 23, 59, 59);
    expect(weekStartKey(monday)).toBe(WEEK_START);
    expect(weekStartKey(sunday)).toBe(WEEK_START);
    expect(weekStartKey(new Date(2026, 9, 26, 0, 0, 0))).toBe('2026-10-26');
    expect(weekEndExclusiveKey(WEEK_START)).toBe('2026-10-26');
  });

  it('週の開始はロケールの日曜始まりに左右されない', () => {
    expect(toDateKey(startOfWeek(new Date(2026, 9, 25, 12)))).toBe(WEEK_START);
  });

  it('旧データの scheduledAt からも予定日を補完する', () => {
    const local = new Date(2026, 9, 21, 18, 30);
    const key = taskScheduledDateKey({ scheduledAt: local.toISOString() } as Task);
    expect(key).toBe('2026-10-21');
  });
});

describe('削除済みタスクの扱い', () => {
  it('完了済みで削除されたタスクは分母と分子に残る', () => {
    const task = makeTask({
      status: 'completed',
      archivedAt: '2026-10-21T00:00:00.000Z',
    });
    expect(isTaskEligibleForWeek(task, WEEK_START)).toBe(true);
    expect(summarizeWeek([task], WEEK_START).completedTaskCount).toBe(1);
  });

  it('週の途中で作成・削除された未完了タスクは分母から除外する', () => {
    const task = makeTask({
      createdAt: '2026-10-20T00:00:00.000Z',
      archivedAt: '2026-10-21T00:00:00.000Z',
    });
    expect(isTaskEligibleForWeek(task, WEEK_START)).toBe(false);
  });

  it('以前から予定されていたタスクの削除は分母に残す', () => {
    const task = makeTask({
      createdAt: '2026-10-10T00:00:00.000Z',
      archivedAt: '2026-10-21T00:00:00.000Z',
    });
    expect(isTaskEligibleForWeek(task, WEEK_START)).toBe(true);
  });
});

describe('報酬倍率', () => {
  it('基本報酬75・×1.30は切り捨てで97になる', () => {
    const reward = applyRewardMultiplier({ currency: 75, materials: {}, experience: 0 }, 1.3);
    expect(reward.currency).toBe(97);
  });

  it('素材・経験値にも設定どおり適用し、端数を切り捨てる', () => {
    const reward = applyRewardMultiplier(
      { currency: 100, materials: { shard_sun: 5, shard_moon: 3 }, experience: 7 },
      1.5,
    );
    expect(reward.currency).toBe(150);
    expect(reward.materials.shard_sun).toBe(7);
    expect(reward.materials.shard_moon).toBe(4);
    expect(reward.experience).toBe(10);
  });

  it('倍率1.0では報酬が変化しない', () => {
    const reward = applyRewardMultiplier(
      { currency: 100, materials: { shard_star: 9 }, experience: 3 },
      1,
    );
    expect(reward).toEqual({ currency: 100, materials: { shard_star: 9 }, experience: 3 });
  });
});

describe('繰り返し予定', () => {
  const rule: RecurrenceRule = {
    id: 'rule-1',
    title: '英語',
    description: '',
    category: '勉強',
    estimatedMinutes: 60,
    frequency: 'weekly',
    daysOfWeek: [1],
    startTime: '18:00',
    endTime: '19:00',
    effectiveFrom: '2026-10-01',
    isActive: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };

  it('曜日と適用期間に一致する日だけ生成する', () => {
    expect(ruleAppliesOnDate(rule, '2026-10-19')).toBe(true);
    expect(ruleAppliesOnDate(rule, '2026-10-20')).toBe(false);
    expect(ruleAppliesOnDate({ ...rule, effectiveFrom: '2026-10-20' }, '2026-10-19')).toBe(false);
    expect(occurrenceDatesForWeek(rule, WEEK_START)).toEqual(['2026-10-19']);
  });

  it('同じルール・予定日の予定を重複生成しない', () => {
    const generated = buildOccurrenceTask(rule, '2026-10-19', 'task-1', '2026-10-19T00:00:00.000Z');
    expect(occurrenceExists([generated], rule.id, '2026-10-19')).toBe(true);
    expect(occurrenceExists([], rule.id, '2026-10-19')).toBe(false);
    expect(occurrenceDatesForWeek(rule, '2026-10-26')).toEqual(['2026-10-26']);
  });

  it('日付を移動した予定は元の予定日の重複判定にだけ使う', () => {
    const generated = buildOccurrenceTask(rule, '2026-10-19', 'task-1', '2026-10-19T00:00:00.000Z');
    const moved = {
      ...generated,
      scheduledDate: '2026-10-20',
      originalScheduledDate: '2026-10-19',
    };
    expect(occurrenceExists([moved], rule.id, '2026-10-19')).toBe(true);
    expect(occurrenceExists([moved], rule.id, '2026-10-20')).toBe(false);
  });
});

describe('初期状態', () => {
  it('追跡開始週と初期値が設定される', () => {
    const progress = emptyWeeklyProgress(new Date(2026, 9, 21, 12));
    expect(progress.trackingStartedWeek).toBe(WEEK_START);
    expect(progress.currentStreak).toBe(0);
    expect(progress.lastEvaluatedWeekStart).toBeNull();
  });
});
