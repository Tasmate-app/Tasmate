import { describe, expect, it } from 'vitest';
import { calculateFacilityProduction, facilityUpgradeCost } from '../src/domain/facility';
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

describe('facilityUpgradeCost', () => {
  it('レベルに比例した正の費用を返す', () => {
    expect(facilityUpgradeCost(1)).toBeGreaterThan(0);
    expect(facilityUpgradeCost(3)).toBeGreaterThan(facilityUpgradeCost(1));
  });
});
