import { describe, expect, it } from 'vitest';
import type { HistoryEntry, WorkSession } from '../src/types/index';
import {
  aggregateByCategory,
  aggregateBySubCategory,
  buildHistoryEntries,
  buildTimeSeries,
  computeWorkTimeTotals,
  filterHistoryEntries,
  formatWorkDuration,
  sessionDateKey,
  sessionWorkSeconds,
} from '@tasmate/core';

function session(overrides: Partial<WorkSession> = {}): WorkSession {
  return {
    id: 'session-1',
    taskId: 'task-1',
    startedAt: '2026-10-21T01:00:00.000Z',
    accumulatedSeconds: 0,
    state: 'idle',
    destinationId: 'd-hills',
    assignedCharacterIds: ['c-hinata'],
    endedAt: '2026-10-21T01:25:00.000Z',
    result: 'completed',
    ...overrides,
  };
}

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    sessionId: 'session-1',
    taskId: 'task-1',
    taskTitle: 'タスク',
    startedAt: '2026-10-21T01:00:00.000Z',
    endedAt: '2026-10-21T01:25:00.000Z',
    dateKey: '2026-10-21',
    categoryId: 'cat-default-study',
    categoryName: '勉強',
    categoryArchived: false,
    subCategoryId: 'sub-default-study-math',
    subCategoryName: '数学',
    subCategoryArchived: false,
    durationSeconds: 1500,
    result: 'completed',
    completed: true,
    ...overrides,
  };
}

describe('実作業秒の計算', () => {
  it('一時停止中の時間を含めない', () => {
    const paused = session({
      startedAt: '2026-10-21T01:00:00.000Z',
      pausedAt: '2026-10-21T01:25:00.000Z',
      endedAt: '2026-10-21T01:40:00.000Z',
    });
    expect(sessionWorkSeconds(paused)).toBe(1500);
  });

  it('再開前の蓄積秒と再開後の区間を合算する', () => {
    const resumed = session({
      accumulatedSeconds: 1500,
      startedAt: '2026-10-21T01:40:00.000Z',
      endedAt: '2026-10-21T02:00:00.000Z',
    });
    expect(sessionWorkSeconds(resumed)).toBe(2700);
  });

  it('終了していないセッションは 0 秒', () => {
    expect(sessionWorkSeconds(session({ endedAt: undefined, result: undefined }))).toBe(0);
  });

  it('作業日は最初の開始時刻を優先する', () => {
    const resumed = session({
      firstStartedAt: '2026-10-20T14:55:00.000Z',
      startedAt: '2026-10-21T01:00:00.000Z',
    });
    expect(sessionDateKey(resumed)).toBe('2026-10-20');
  });
});

describe('履歴エントリの生成', () => {
  it('セッション開始時のスナップショットを使う', () => {
    const entries = buildHistoryEntries(
      [
        session({
          taskTitleSnapshot: '開始時の名前',
          categoryIdSnapshot: 'cat-deleted',
          categoryNameSnapshot: '旧カテゴリー',
          subCategoryIdSnapshot: 'sub-deleted',
          subCategoryNameSnapshot: '旧サブ',
        }),
      ],
      [],
      [
        {
          id: 'cat-deleted',
          name: '現在の名前',
          order: 0,
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
          archivedAt: '2026-10-02T00:00:00.000Z',
        },
      ],
      [
        {
          id: 'sub-deleted',
          categoryId: 'cat-deleted',
          name: '現在のサブ',
          order: 0,
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
          archivedAt: '2026-10-02T00:00:00.000Z',
        },
      ],
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].taskTitle).toBe('開始時の名前');
    expect(entries[0].categoryName).toBe('旧カテゴリー');
    expect(entries[0].subCategoryName).toBe('旧サブ');
    expect(entries[0].categoryArchived).toBe(true);
    expect(entries[0].subCategoryArchived).toBe(true);
    expect(entries[0].durationSeconds).toBe(1500);
  });

  it('スナップショットが無い旧セッションは現在のタスクで補完する', () => {
    const entries = buildHistoryEntries(
      [session()],
      [
        {
          id: 'task-1',
          title: '現在のタスク名',
          category: '作業',
          categoryId: 'cat-default-work',
          subCategoryId: 'sub-default-work-programming',
        },
      ],
      [],
      [],
    );
    expect(entries[0].taskTitle).toBe('現在のタスク名');
    expect(entries[0].categoryName).toBe('作業');
    expect(entries[0].subCategoryName).toBeNull();
  });

  it('未終了セッションは一覧に含めない', () => {
    const entries = buildHistoryEntries(
      [session({ endedAt: undefined, result: undefined })],
      [],
      [],
      [],
    );
    expect(entries).toEqual([]);
  });
});

describe('期間集計', () => {
  const now = new Date(2026, 9, 21, 12);
  const entries = [
    entry({ sessionId: 'today', dateKey: '2026-10-21', durationSeconds: 600 }),
    entry({ sessionId: 'week', dateKey: '2026-10-19', durationSeconds: 900 }),
    entry({ sessionId: 'before-week', dateKey: '2026-10-18', durationSeconds: 1200 }),
    entry({ sessionId: 'last-month', dateKey: '2026-09-30', durationSeconds: 1800 }),
  ];

  it('今日・今週（月曜始まり）・今月・累計を集計する', () => {
    expect(computeWorkTimeTotals(entries, now)).toEqual({
      today: 600,
      week: 1500,
      month: 2700,
      total: 4500,
    });
  });

  it('カテゴリーとサブカテゴリーで絞り込める', () => {
    const withCategories = [
      entry({ sessionId: 'a', durationSeconds: 300 }),
      entry({
        sessionId: 'b',
        categoryId: 'cat-default-work',
        categoryName: '作業',
        subCategoryId: 'sub-default-work-programming',
        subCategoryName: 'プログラミング',
        durationSeconds: 600,
      }),
      entry({
        sessionId: 'c',
        categoryId: 'cat-default-work',
        categoryName: '作業',
        subCategoryId: null,
        subCategoryName: null,
        durationSeconds: 100,
      }),
    ];
    expect(filterHistoryEntries(withCategories, { categoryId: 'cat-default-work' })).toHaveLength(2);
    expect(
      filterHistoryEntries(withCategories, {
        categoryId: 'cat-default-work',
        subCategoryId: null,
      }),
    ).toHaveLength(1);
  });
});

describe('カテゴリー別集計', () => {
  it('秒数と割合を計算し、削除済みフラグをまとめる', () => {
    const entries = [
      entry({ sessionId: 'a', durationSeconds: 300 }),
      entry({ sessionId: 'b', durationSeconds: 100, categoryArchived: true }),
      entry({
        sessionId: 'c',
        categoryId: 'cat-default-work',
        categoryName: '作業',
        subCategoryId: 'sub-default-work-programming',
        subCategoryName: 'プログラミング',
        durationSeconds: 600,
      }),
    ];
    const totals = aggregateByCategory(entries);
    expect(totals[0]).toMatchObject({
      categoryId: 'cat-default-work',
      seconds: 600,
      ratio: 0.6,
    });
    expect(totals[1]).toMatchObject({
      categoryId: 'cat-default-study',
      seconds: 400,
      ratio: 0.4,
      archived: true,
    });

    const subs = aggregateBySubCategory(entries, 'cat-default-study');
    expect(subs).toHaveLength(1);
    expect(subs[0].seconds).toBe(400);
    expect(subs[0].ratio).toBe(1);
  });
});

describe('推移系列', () => {
  it('日単位で指定件数の系列を返す', () => {
    const entries = [
      entry({ sessionId: 'a', dateKey: '2026-10-20', durationSeconds: 60 }),
      entry({ sessionId: 'b', dateKey: '2026-10-21', durationSeconds: 120 }),
    ];
    const series = buildTimeSeries(entries, 'day', '2026-10-21', 3);
    expect(series.map((point) => point.key)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21']);
    expect(series.map((point) => point.seconds)).toEqual([0, 60, 120]);
  });

  it('月単位で年をまたいでも連続したバケットになる', () => {
    const series = buildTimeSeries([], 'month', '2026-01-15', 3);
    expect(series.map((point) => point.key)).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('週単位は月曜始まりで集計する', () => {
    const entries = [
      entry({ sessionId: 'a', dateKey: '2026-10-19', durationSeconds: 60 }),
      entry({ sessionId: 'b', dateKey: '2026-10-25', durationSeconds: 120 }),
      entry({ sessionId: 'c', dateKey: '2026-10-26', durationSeconds: 30 }),
    ];
    const series = buildTimeSeries(entries, 'week', '2026-10-26', 2);
    expect(series.map((point) => point.key)).toEqual(['2026-10-19', '2026-10-26']);
    expect(series.map((point) => point.seconds)).toEqual([180, 30]);
  });
});

describe('作業時間の表示', () => {
  it.each([
    [0, '0分'],
    [59, '1分未満'],
    [60, '1分'],
    [1500, '25分'],
    [3600, '1時間'],
    [3900, '1時間5分'],
    [3660, '1時間1分'],
  ])('%i 秒を %s と表示する', (seconds, expected) => {
    expect(formatWorkDuration(seconds)).toBe(expected);
  });
});
