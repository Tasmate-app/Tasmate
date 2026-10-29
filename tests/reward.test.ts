import { describe, expect, it } from 'vitest';
import { finalizeReward, levelUpCost, proposeReward } from '../src/domain/reward';
import { BALANCE } from '../src/domain/constants';
import type { WorkOutcomeInput } from '../src/types/index';

function makeInput(overrides: Partial<WorkOutcomeInput> = {}): WorkOutcomeInput {
  return {
    workMinutes: 25,
    characters: [{ definitionId: 'c-sun', level: 1, experience: 0 }],
    characterDefinitions: [
      { id: 'c-sun', name: 'ヒナタ', attribute: 'sun', baseEfficiency: 1.0, description: '' },
    ],
    destination: {
      id: 'd-hills',
      name: '朝日の丘',
      description: '',
      availableMaterials: { shard_sun: 1 },
      baseEfficiency: 1.0,
      recommendedAttributes: ['sun'],
    },
    facilities: [{ definitionId: 'f-coin', level: 1, enabled: true }],
    facilityDefinitions: [
      {
        id: 'f-coin',
        name: 'コイン工房',
        type: 'currency',
        description: '',
        baseProductionPerMinute: 5,
      },
    ],
    completed: true,
    ...overrides,
  };
}

describe('proposeReward', () => {
  it('作業時間に応じて通貨・素材・経験値を得られる', () => {
    const { bundle } = proposeReward(makeInput());
    expect(bundle.currency).toBeGreaterThan(0);
    expect(bundle.experience).toBeGreaterThan(0);
    expect(bundle.materials['shard_sun']).toBeGreaterThan(0);
  });

  it('中断時は報酬が減るが0にはならない（短時間でもなければ）', () => {
    const done = proposeReward(makeInput({ completed: true }));
    const interrupted = proposeReward(makeInput({ completed: false }));
    expect(interrupted.bundle.currency).toBeLessThanOrEqual(done.bundle.currency);
    expect(interrupted.bundle.currency).toBeGreaterThan(0);
  });

  it('上限でクランプされる', () => {
    const { bundle } = proposeReward(makeInput({ workMinutes: 10_000 }));
    expect(bundle.currency).toBeLessThanOrEqual(BALANCE.maxCurrencyPerSession);
    for (const v of Object.values(bundle.materials)) {
      expect(v ?? 0).toBeLessThanOrEqual(BALANCE.maxMaterialPerSession);
    }
  });

  it('0分では通貨・経験値が0になる', () => {
    const { bundle } = proposeReward(makeInput({ workMinutes: 0 }));
    expect(bundle.currency).toBe(0);
    expect(bundle.experience).toBe(0);
  });

  it('中断時の施設生産素材に報酬係数を二重適用しない', () => {
    const { bundle } = proposeReward(
      makeInput({
        workMinutes: 25,
        characters: [],
        facilities: [{ definitionId: 'f-star', level: 1, enabled: true }],
        facilityDefinitions: [
          {
            id: 'f-star',
            name: '星屑ハウス',
            type: 'material',
            description: '',
            baseProductionPerMinute: 0.4,
            materialId: 'shard_star',
          },
        ],
        completed: false,
      }),
    );

    expect(bundle.materials['shard_star']).toBe(5);
  });
});

describe('finalizeReward', () => {
  it('未知アイテムを除去し範囲を検証する', () => {
    const fixed = finalizeReward({
      currency: 999_999,
      // @ts-expect-error テスト用に不正データを混入
      materials: { shard_sun: 5, unknown_item: 99, shard_moon: -3 },
      experience: 42,
    });
    expect(fixed.currency).toBe(BALANCE.maxCurrencyPerSession);
    expect(fixed.materials['shard_sun']).toBe(5);
    expect('unknown_item' in fixed.materials).toBe(false);
    expect('shard_moon' in fixed.materials).toBe(false);
    expect(fixed.experience).toBe(42);
  });

  it('NaN・負数は0に正規化する', () => {
    const fixed = finalizeReward({ currency: Number.NaN, materials: {}, experience: -10 });
    expect(fixed.currency).toBe(0);
    expect(fixed.experience).toBe(0);
  });
});

describe('levelUpCost', () => {
  it('レベルに応じて費用が増える', () => {
    expect(levelUpCost(2)).toBeGreaterThan(levelUpCost(1));
  });
});
