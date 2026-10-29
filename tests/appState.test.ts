import { describe, expect, it } from 'vitest';
import { toDateKey } from '../src/domain/weekly';
import { normalizeAppState, type AppState } from '../src/services/appState';
import type { RewardRecord, Task } from '../src/types/index';

describe('旧保存データの正規化', () => {
  it('scheduledAt しかない旧タスクへ scheduledDate を補完する', () => {
    const scheduledAt = new Date(2026, 9, 19, 12, 0, 0).toISOString();
    const legacyTask = {
      id: 'legacy-task',
      title: '旧タスク',
      description: '',
      category: '勉強',
      estimatedMinutes: 25,
      scheduledAt,
      status: 'planned',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    } as Task;
    const legacy = {
      version: 1,
      tasks: [legacyTask],
      sessionHistory: [],
      inventory: { currency: 0, materials: {} },
      characters: [],
      facilities: [],
      rewards: [],
      appliedRewardSessionIds: [],
    } as unknown as AppState;

    const normalized = normalizeAppState(legacy, new Date(2026, 9, 23, 12));
    expect(normalized.tasks[0].scheduledDate).toBe(toDateKey(new Date(scheduledAt)));
    expect(normalized.recurrenceRules).toEqual([]);
    expect(normalized.weeklyEvaluations).toEqual([]);
    expect(normalized.restWeeks).toEqual([]);
    expect(normalized.weeklyProgress.trackingStartedWeek).toBe('2026-10-19');
  });

  it('倍率情報を持たない旧報酬を等倍として補完する', () => {
    const finalReward = {
      currency: 120,
      materials: { shard_sun: 3 },
      experience: 40,
    };
    const legacyReward = {
      id: 'reward-legacy',
      workSessionId: 'session-legacy',
      inputSummary: '旧報酬',
      proposedReward: finalReward,
      finalReward,
      reason: '旧データ',
      createdAt: '2026-10-01T00:00:00.000Z',
      status: 'approved',
    } as RewardRecord;
    const legacy = {
      version: 1,
      tasks: [],
      sessionHistory: [],
      inventory: { currency: 0, materials: {} },
      characters: [],
      facilities: [],
      rewards: [legacyReward],
      appliedRewardSessionIds: [],
    } as unknown as AppState;

    const normalized = normalizeAppState(legacy, new Date(2026, 9, 23, 12));
    expect(normalized.rewards[0].rewardMultiplier).toBe(1);
    expect(normalized.rewards[0].baseReward).toEqual(finalReward);
  });

  it('欠損・不正な所持素材を 0 に正規化する', () => {
    const legacy = {
      version: 1,
      tasks: [],
      sessionHistory: [],
      inventory: {
        currency: Number.NaN,
        materials: { shard_sun: 3, shard_moon: Number.NaN, shard_star: -2 },
      },
      characters: [],
      facilities: [],
      rewards: [],
      appliedRewardSessionIds: [],
    } as unknown as AppState;

    const normalized = normalizeAppState(legacy, new Date(2026, 9, 23, 12));

    expect(normalized.inventory).toEqual({
      currency: 0,
      materials: { shard_sun: 3, shard_moon: 0, shard_star: 0 },
    });
  });
});
