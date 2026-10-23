import { describe, expect, it } from 'vitest';
import { calculateCollection, characterEfficiency } from '../src/domain/collection';
import type { CharacterDefinition, Destination, OwnedCharacter } from '../src/types/index';

const defs: CharacterDefinition[] = [
  { id: 'c-sun', name: 'ヒナタ', attribute: 'sun', baseEfficiency: 1.0, description: '' },
  { id: 'c-moon', name: 'ルナ', attribute: 'moon', baseEfficiency: 1.2, description: '' },
];

const destination: Destination = {
  id: 'd-hills',
  name: '朝日の丘',
  description: '',
  availableMaterials: { shard_sun: 0.7, shard_star: 0.3 },
  baseEfficiency: 1.0,
  recommendedAttributes: ['sun'],
};

describe('characterEfficiency', () => {
  it('レベルと相性で効率が上がる', () => {
    const owned: OwnedCharacter = { definitionId: 'c-sun', level: 1, experience: 0 };
    const base = characterEfficiency(owned, defs[0], destination);
    expect(base).toBeCloseTo(1.0 * 1.5, 5);

    const lv5: OwnedCharacter = { definitionId: 'c-sun', level: 5, experience: 0 };
    const boosted = characterEfficiency(lv5, defs[0], destination);
    expect(boosted).toBeCloseTo(1.0 * (1 + 4 * 0.1) * 1.5, 5);
  });

  it('相性不一致ではボーナスが付かない', () => {
    const owned: OwnedCharacter = { definitionId: 'c-moon', level: 1, experience: 0 };
    const eff = characterEfficiency(owned, defs[1], destination);
    expect(eff).toBeCloseTo(1.2, 5);
  });
});

describe('calculateCollection', () => {
  it('作業時間に比例して素材を得られる', () => {
    const owned: OwnedCharacter[] = [{ definitionId: 'c-sun', level: 1, experience: 0 }];
    const r10 = calculateCollection(10, owned, defs, destination);
    const r20 = calculateCollection(20, owned, defs, destination);
    expect(r10.shard_sun).toBeGreaterThan(0);
    // 比率どおりに分配される（7:3）
    expect(r10.shard_sun ?? 0).toBeGreaterThanOrEqual(r10.shard_star ?? 0);
    expect(r20.shard_sun ?? 0).toBeGreaterThanOrEqual((r10.shard_sun ?? 0) * 1.5);
  });

  it('0分・負数・NaNでは空を返す', () => {
    const owned: OwnedCharacter[] = [{ definitionId: 'c-sun', level: 1, experience: 0 }];
    expect(calculateCollection(0, owned, defs, destination)).toEqual({});
    expect(calculateCollection(-5, owned, defs, destination)).toEqual({});
    expect(calculateCollection(Number.NaN, owned, defs, destination)).toEqual({});
  });

  it('派遣キャラ指定に対応する', () => {
    const owned: OwnedCharacter[] = [
      { definitionId: 'c-sun', level: 1, experience: 0 },
      { definitionId: 'c-moon', level: 1, experience: 0 },
    ];
    const all = calculateCollection(30, owned, defs, destination);
    const one = calculateCollection(30, owned, defs, destination, ['c-moon']);
    const total = (r: typeof all) => Object.values(r).reduce((a, b) => a + (b ?? 0), 0);
    expect(total(all)).toBeGreaterThanOrEqual(total(one));
  });

  it('定義不明キャラは無視する', () => {
    const owned: OwnedCharacter[] = [{ definitionId: 'unknown', level: 9, experience: 0 }];
    expect(calculateCollection(30, owned, defs, destination)).toEqual({});
  });
});
