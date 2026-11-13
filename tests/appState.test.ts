import { describe, expect, it } from 'vitest';
import { createDefaultNavigationItems } from '@tasmate/core';
import { toDateKey } from '../src/domain/weekly';
import {
  isValidAppState,
  normalizeAppState,
  type AppState,
} from '../src/services/appState';
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
    expect(normalized.restSession).toBeNull();
    expect(normalized.supportEvents).toEqual([]);
  });

  it('不正な休息・応援イベントを保存データから除去する', () => {
    const legacy = {
      version: 1,
      tasks: [],
      sessionHistory: [],
      inventory: { currency: 0, materials: {} },
      characters: [],
      facilities: [],
      rewards: [],
      appliedRewardSessionIds: [],
      restSession: { id: 'rest-broken' },
      supportEvents: [
        { id: 'event-ok', kind: 'rest-complete', characterId: 'c-hinata', message: '完了', createdAt: '2026-10-01T00:00:00.000Z' },
        { id: 'event-broken', kind: 'unknown' },
      ],
    } as unknown as AppState;

    const normalized = normalizeAppState(legacy, new Date(2026, 9, 23, 12));
    expect(normalized.restSession).toBeNull();
    expect(normalized.supportEvents).toHaveLength(1);
    expect(normalized.supportEvents[0].id).toBe('event-ok');
    expect(normalized.supportEvents[0].seen).toBe(false);
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

describe('保存データの検証', () => {
  const base = {
    version: 1,
    tasks: [],
    sessionHistory: [],
    inventory: { currency: 0, materials: {} },
    characters: [],
    facilities: [],
    rewards: [],
    appliedRewardSessionIds: [],
  };

  it('inventory が null のデータを不正として扱う', () => {
    expect(isValidAppState({ ...base, inventory: null })).toBe(false);
  });

  it('activeSession が不正なオブジェクトなら不正として扱う', () => {
    expect(isValidAppState({ ...base, activeSession: {} })).toBe(false);
  });

  it('任意フィールドが欠けた旧データは受け入れる', () => {
    expect(isValidAppState(base)).toBe(true);
  });

  it('settings がオブジェクトでないデータを不正として扱う', () => {
    expect(isValidAppState({ ...base, settings: 'invalid' })).toBe(false);
  });

  it('lastBackupAt が文字列でない settings を不正として扱う', () => {
    expect(isValidAppState({ ...base, settings: { lastBackupAt: 123 } })).toBe(false);
  });
});

describe('不足フィールドの補完', () => {
  function makeLegacy(overrides: Record<string, unknown> = {}): AppState {
    return {
      version: 1,
      tasks: [],
      sessionHistory: [],
      inventory: { currency: 0, materials: {} },
      characters: [],
      facilities: [],
      rewards: [],
      appliedRewardSessionIds: [],
      ...overrides,
    } as unknown as AppState;
  }

  it('inventory が null でも通貨・素材を 0 に補完する', () => {
    const normalized = normalizeAppState(makeLegacy({ inventory: null }));
    expect(normalized.inventory).toEqual({
      currency: 0,
      materials: { shard_sun: 0, shard_moon: 0, shard_star: 0 },
    });
  });

  it('activeSession の欠落を null に補完する', () => {
    const normalized = normalizeAppState(makeLegacy());
    expect(normalized.activeSession).toBeNull();
  });

  it('weeklyProgress.lastEvaluatedWeekStart の欠落を null に補完する', () => {
    const normalized = normalizeAppState(
      makeLegacy({
        weeklyProgress: {
          userId: 'local-user',
          trackingStartedWeek: '2026-10-19',
          currentStreak: 0,
          totalSuccessfulWeeks: 0,
          highestStreak: 0,
          updatedAt: '2026-10-19T00:00:00.000Z',
        },
      }),
      new Date(2026, 9, 23, 12),
    );
    expect(normalized.weeklyProgress.lastEvaluatedWeekStart).toBeNull();
    expect(normalized.weeklyProgress.trackingStartedWeek).toBe('2026-10-19');
  });

  it('settings の欠落を未バックアップとして補完する', () => {
    const normalized = normalizeAppState(makeLegacy());
    expect(normalized.settings).toEqual({
      lastBackupAt: null,
      navigationItems: createDefaultNavigationItems(),
    });
  });

  it('不正な lastBackupAt を null に補完する', () => {
    const normalized = normalizeAppState(
      makeLegacy({ settings: { lastBackupAt: 'not-a-date' } }),
    );
    expect(normalized.settings).toEqual({
      lastBackupAt: null,
      navigationItems: createDefaultNavigationItems(),
    });
  });

  it('正しい lastBackupAt を維持する', () => {
    const normalized = normalizeAppState(
      makeLegacy({ settings: { lastBackupAt: '2026-11-12T09:30:00.000Z' } }),
    );
    expect(normalized.settings.lastBackupAt).toBe('2026-11-12T09:30:00.000Z');
  });
});
