// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addDaysToKey,
  nextWeekStartKey,
  weekEndExclusiveKey,
  weekStartKey,
} from '../src/domain/weekly';
import { initialAppState } from '../src/services/appState';
import { useAppStore } from '../src/stores/appStore';
import type { Task, WeeklyProgress } from '../src/types/index';

const WEEK_ONE = '2025-01-06';
const WEEK_TWO = '2025-01-13';
const NOW_MS = Date.parse('2025-01-20T12:00:00');

function makeProgress(overrides: Partial<WeeklyProgress> = {}): WeeklyProgress {
  return {
    userId: 'local-user',
    trackingStartedWeek: WEEK_ONE,
    currentStreak: 0,
    totalSuccessfulWeeks: 0,
    highestStreak: 0,
    lastEvaluatedWeekStart: null,
    updatedAt: '2025-01-06T00:00:00.000Z',
    ...overrides,
  };
}

function makeTasks(
  prefix: string,
  weekStart: string,
  total: number,
  completed: number,
): Task[] {
  const start = Date.parse(`${weekStart}T00:00:00`);
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + (index % 7));
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      id: `${prefix}-${index}`,
      title: `${prefix}-${index}`,
      description: '',
      category: '勉強',
      estimatedMinutes: 25,
      scheduledDate: dateKey,
      status: index < completed ? 'completed' : 'planned',
      createdAt: '2024-12-01T00:00:00.000Z',
      updatedAt: '2024-12-01T00:00:00.000Z',
    };
  });
}

function resetStore(): void {
  window.localStorage.clear();
  useAppStore.setState({ ...initialAppState() });
}

describe('週次判定のストア統合', () => {
  beforeEach(resetStore);

  it('未判定週を古い順に判定し、同じ週を再判定しない', () => {
    useAppStore.setState({
      tasks: [...makeTasks('w1', WEEK_ONE, 10, 8), ...makeTasks('w2', WEEK_TWO, 10, 0)],
      weeklyProgress: makeProgress(),
      weeklyEvaluations: [],
      restWeeks: [],
    });

    const first = useAppStore.getState().evaluateDueWeeks(NOW_MS);
    expect(first.map((evaluation) => evaluation.weekStart)).toEqual([WEEK_ONE, WEEK_TWO]);
    expect(first[0].status).toBe('achieved');
    expect(first[1].status).toBe('missed');

    const state = useAppStore.getState();
    expect(state.weeklyEvaluations).toHaveLength(2);
    expect(state.weeklyProgress.currentStreak).toBe(0);
    expect(state.weeklyProgress.totalSuccessfulWeeks).toBe(1);
    expect(state.weeklyProgress.lastEvaluatedWeekStart).toBe(WEEK_TWO);

    const second = useAppStore.getState().evaluateDueWeeks(NOW_MS);
    expect(second).toEqual([]);
    expect(useAppStore.getState().weeklyEvaluations).toHaveLength(2);
  });

  it('lastEvaluatedWeekStart が欠けていても例外にならない', () => {
    useAppStore.setState({
      tasks: [],
      weeklyProgress: {
        ...makeProgress(),
        lastEvaluatedWeekStart: undefined,
      } as unknown as WeeklyProgress,
      weeklyEvaluations: [],
      restWeeks: [],
    });

    expect(() => useAppStore.getState().evaluateDueWeeks(NOW_MS)).not.toThrow();
  });

  it('休息週は継続を維持し、判定履歴には rest として残る', () => {
    useAppStore.setState({
      tasks: [],
      weeklyProgress: makeProgress({ trackingStartedWeek: WEEK_TWO, currentStreak: 3 }),
      weeklyEvaluations: [],
      restWeeks: [WEEK_TWO],
    });

    const created = useAppStore.getState().evaluateDueWeeks(NOW_MS);
    expect(created).toHaveLength(1);
    expect(created[0].status).toBe('rest');
    expect(useAppStore.getState().weeklyProgress.currentStreak).toBe(3);
  });

  it('完了した週次報酬に現在の継続倍率を適用して記録する', () => {
    const task: Task = {
      id: 'reward-task',
      title: '報酬テスト',
      description: '',
      category: '勉強',
      estimatedMinutes: 25,
      scheduledDate: '2025-01-20',
      status: 'planned',
      createdAt: '2025-01-20T00:00:00.000Z',
      updatedAt: '2025-01-20T00:00:00.000Z',
    };
    useAppStore.setState({
      tasks: [task],
      weeklyProgress: makeProgress({
        trackingStartedWeek: '2025-01-20',
        currentStreak: 2,
        highestStreak: 2,
      }),
      activeSession: {
        id: 'session-reward',
        taskId: task.id,
        startedAt: new Date(Date.now() - 25 * 60_000).toISOString(),
        accumulatedSeconds: 0,
        state: 'running',
        destinationId: 'd-hills',
        assignedCharacterIds: ['c-hinata'],
      },
    });

    const rewardId = useAppStore.getState().finishSession('completed');
    const record = useAppStore.getState().rewards.find((reward) => reward.id === rewardId);
    expect(record).toBeDefined();
    expect(record?.rewardMultiplier).toBe(1.1);
    expect(record?.baseReward).toBeDefined();
    expect(record?.finalReward.currency).toBe(
      Math.floor((record?.baseReward?.currency ?? 0) * 1.1),
    );
  });
});

describe('繰り返し予定のストア統合', () => {
  beforeEach(resetStore);

  it('同じ週の生成を重複させず、削除済みの予定を再生成しない', () => {
    const ruleId = useAppStore.getState().createRecurrenceRule({
      title: '朝の読書',
      description: '',
      category: '勉強',
      estimatedMinutes: 30,
      daysOfWeek: [1, 3],
      startTime: '07:00',
      endTime: '07:30',
      effectiveFrom: WEEK_ONE,
    });
    expect(ruleId).not.toBe('');

    const countForWeek = (weekStart: string) =>
      useAppStore
        .getState()
        .tasks.filter(
          (task) =>
            task.recurrenceId === ruleId &&
            task.scheduledDate !== undefined &&
            task.scheduledDate >= weekStart &&
            task.scheduledDate < weekEndExclusiveKey(weekStart),
        ).length;

    expect(countForWeek(WEEK_ONE)).toBe(2);
    useAppStore.getState().ensureRecurringOccurrencesForWeek(WEEK_ONE);
    expect(countForWeek(WEEK_ONE)).toBe(2);

    const first = useAppStore
      .getState()
      .tasks.find((task) => task.recurrenceId === ruleId && task.scheduledDate === WEEK_ONE);
    expect(first).toBeDefined();
    useAppStore.getState().deleteTask(first?.id ?? '');

    useAppStore.getState().ensureRecurringOccurrencesForWeek(WEEK_ONE);
    expect(countForWeek(WEEK_ONE)).toBe(2);
    expect(
      useAppStore.getState().tasks.filter((task) => task.recurrenceId === ruleId),
    ).toHaveLength(2);

    useAppStore.getState().ensureRecurringOccurrencesForWeek(WEEK_TWO);
    expect(
      useAppStore.getState().tasks.filter((task) => task.recurrenceId === ruleId),
    ).toHaveLength(4);
  });

  it('曜日を削除して再追加するとルール変更でアーカイブした予定を復元する', () => {
    const weekStart = nextWeekStartKey(weekStartKey(new Date()));
    const wednesday = addDaysToKey(weekStart, 2);
    const ruleId = useAppStore.getState().createRecurrenceRule({
      title: '週次テスト',
      description: '',
      category: '勉強',
      estimatedMinutes: 30,
      daysOfWeek: [1, 3],
      effectiveFrom: weekStart,
    });
    const liveCount = () =>
      useAppStore
        .getState()
        .tasks.filter(
          (task) =>
            task.recurrenceId === ruleId &&
            task.scheduledDate === wednesday &&
            task.archivedAt === undefined,
        ).length;

    expect(liveCount()).toBe(1);
    useAppStore.getState().updateRecurrenceRule(ruleId, { daysOfWeek: [1] });
    expect(liveCount()).toBe(0);
    const archived = useAppStore
      .getState()
      .tasks.find((task) => task.recurrenceId === ruleId && task.scheduledDate === wednesday);
    expect(archived?.archiveReason).toBe('rule');

    useAppStore.getState().updateRecurrenceRule(ruleId, { daysOfWeek: [1, 3] });
    useAppStore.getState().ensureRecurringOccurrencesForWeek(weekStart);

    expect(liveCount()).toBe(1);
    const restored = useAppStore
      .getState()
      .tasks.find((task) => task.recurrenceId === ruleId && task.scheduledDate === wednesday);
    expect(restored?.id).toBe(archived?.id);
    expect(restored?.archivedAt).toBeUndefined();
    expect(restored?.archiveReason).toBeUndefined();
  });

  it('ユーザーが削除した予定は曜日を再追加しても復元しない', () => {
    const weekStart = nextWeekStartKey(weekStartKey(new Date()));
    const wednesday = addDaysToKey(weekStart, 2);
    const ruleId = useAppStore.getState().createRecurrenceRule({
      title: '週次テスト',
      description: '',
      category: '勉強',
      estimatedMinutes: 30,
      daysOfWeek: [1, 3],
      effectiveFrom: weekStart,
    });
    const occurrence = useAppStore
      .getState()
      .tasks.find((task) => task.recurrenceId === ruleId && task.scheduledDate === wednesday);
    expect(occurrence).toBeDefined();

    useAppStore.getState().deleteTask(occurrence?.id ?? '');
    useAppStore.getState().updateRecurrenceRule(ruleId, { daysOfWeek: [1] });
    useAppStore.getState().updateRecurrenceRule(ruleId, { daysOfWeek: [1, 3] });
    useAppStore.getState().ensureRecurringOccurrencesForWeek(weekStart);

    const deleted = useAppStore
      .getState()
      .tasks.find((task) => task.recurrenceId === ruleId && task.scheduledDate === wednesday);
    expect(deleted?.archivedAt).toBeDefined();
    expect(deleted?.archiveReason).toBe('user');
    expect(
      useAppStore
        .getState()
        .tasks.filter(
          (task) =>
            task.recurrenceId === ruleId &&
            task.scheduledDate === wednesday &&
            task.archivedAt === undefined,
        ),
    ).toHaveLength(0);
  it('繰り返し予定の日付を移動すると元の日の予定を再生成しない', () => {
    const ruleId = useAppStore.getState().createRecurrenceRule({
      title: '朝の読書',
      description: '',
      category: '勉強',
      estimatedMinutes: 30,
      daysOfWeek: [1],
      startTime: '07:00',
      endTime: '07:30',
      effectiveFrom: WEEK_ONE,
    });
    const occurrence = useAppStore
      .getState()
      .tasks.find((task) => task.recurrenceId === ruleId && task.scheduledDate === WEEK_ONE);
    expect(occurrence).toBeDefined();

    useAppStore.getState().updateTask(occurrence?.id ?? '', { scheduledDate: '2025-01-07' });
    useAppStore.getState().ensureRecurringOccurrencesForWeek(WEEK_ONE);

    const occurrences = useAppStore
      .getState()
      .tasks.filter((task) => task.recurrenceId === ruleId);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].scheduledDate).toBe('2025-01-07');
    expect(occurrences[0].originalScheduledDate).toBe(WEEK_ONE);
  });
});
