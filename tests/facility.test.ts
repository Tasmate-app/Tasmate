import { describe, expect, it } from 'vitest';
import {
  calculateFacilityProduction,
  facilityLevelFactor,
  facilityProductionPerMinute,
  facilityUpgradeCost,
  formatFacilityProduction,
} from '../src/domain/facility';
import type { FacilityDefinition, OwnedFacility } from '../src/types/index';

const defs: FacilityDefinition[] = [
  {
    id: 'f-coin',
    name: 'コイン工房',
    type: 'currency',
    description: '',
    baseProductionPerMinute: 5,
  },
  {
    id: 'f-star',
    name: '星屑ハウス',
    type: 'material',
    description: '',
    baseProductionPerMinute: 0.4,
    materialId: 'shard_star',
  },
];

describe('calculateFacilityProduction', () => {
  it('作業時間に比例して通貨・素材を生産する', () => {
    const owned: OwnedFacility[] = [
      { definitionId: 'f-coin', level: 1, enabled: true },
      { definitionId: 'f-star', level: 1, enabled: true },
    ];
    const r = calculateFacilityProduction(10, owned, defs);
    expect(r.currency).toBe(50);
    expect(r.materials['shard_star']).toBe(4);
  });

  it('無効・不明施設は無視する', () => {
    const owned: OwnedFacility[] = [
      { definitionId: 'f-coin', level: 1, enabled: false },
      { definitionId: 'unknown', level: 9, enabled: true },
    ];
    const r = calculateFacilityProduction(10, owned, defs);
    expect(r).toEqual({ currency: 0, materials: {} });
  });

  it('レベルで生産量が増える', () => {
    const lv1: OwnedFacility[] = [{ definitionId: 'f-coin', level: 1, enabled: true }];
    const lv3: OwnedFacility[] = [{ definitionId: 'f-coin', level: 3, enabled: true }];
    const r1 = calculateFacilityProduction(10, lv1, defs);
    const r3 = calculateFacilityProduction(10, lv3, defs);
    expect(r3.currency).toBeGreaterThan(r1.currency);
  });

  it('0分では生産しない', () => {
    const owned: OwnedFacility[] = [{ definitionId: 'f-coin', level: 1, enabled: true }];
    expect(calculateFacilityProduction(0, owned, defs)).toEqual({ currency: 0, materials: {} });
  });
});

describe('facilityLevelFactor', () => {
  it('レベル1は等倍、レベル3は2倍になる', () => {
    expect(facilityLevelFactor(1)).toBe(1);
    expect(facilityLevelFactor(3)).toBe(2);
  });

  it('不正なレベルは1として扱う', () => {
    expect(facilityLevelFactor(0)).toBe(1);
    expect(facilityLevelFactor(Number.NaN)).toBe(1);
  });
});

describe('facilityProductionPerMinute', () => {
  it('現在のレベルに応じた生産量を返す', () => {
    expect(facilityProductionPerMinute(defs[0], 1)).toBe(5);
    expect(facilityProductionPerMinute(defs[0], 3)).toBe(10);
    expect(facilityProductionPerMinute(defs[1], 2)).toBeCloseTo(0.6);
  });
});

describe('formatFacilityProduction', () => {
  it('通貨・素材の現在の生産量を表示用文字列にする', () => {
    expect(formatFacilityProduction(defs[0], 1)).toBe('通貨 5/分');
    expect(formatFacilityProduction(defs[0], 3)).toBe('通貨 10/分');
    expect(formatFacilityProduction(defs[1], 2)).toBe('素材（星のかけら）0.6/分');
  });
});

describe('facilityUpgradeCost', () => {
  it('レベルに比例した正の費用を返す', () => {
    expect(facilityUpgradeCost(1)).toBeGreaterThan(0);
    expect(facilityUpgradeCost(3)).toBeGreaterThan(facilityUpgradeCost(1));
  });
});
