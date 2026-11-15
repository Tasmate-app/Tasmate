import { describe, expect, it } from 'vitest';
import {
  CRYSTAL_SYNTHESIS_COSTS,
  CRYSTAL_SYNTHESIS_SHARDS,
  CRYSTAL_TYPES,
  ITEM_RARITIES,
  createAppStore,
  crystalSynthesisRecipe,
  initialAppState,
  planCrystalSynthesis,
} from '../packages/core/src/index';

describe('結晶の合成レシピ', () => {
  it('結晶タイプごとにかけらの種類を割り当てる', () => {
    expect(CRYSTAL_SYNTHESIS_SHARDS).toEqual({
      knowledge_crystal: 'shard_moon',
      thought_crystal: 'shard_moon',
      creation_crystal: 'shard_sun',
      exploration_crystal: 'shard_star',
      effort_crystal: 'shard_sun',
    });
  });

  it('全レアリティのコストと結晶IDを生成する', () => {
    expect(CRYSTAL_SYNTHESIS_COSTS).toEqual({
      N: { shardQuantity: 5, coinQuantity: 100 },
      R: { shardQuantity: 15, coinQuantity: 300 },
      SR: { shardQuantity: 30, coinQuantity: 800 },
      SSR: { shardQuantity: 60, coinQuantity: 2000 },
      UR: { shardQuantity: 120, coinQuantity: 5000 },
    });

    for (const type of CRYSTAL_TYPES) {
      for (const rarity of ITEM_RARITIES) {
        const recipe = crystalSynthesisRecipe(type, rarity);
        expect(recipe.crystalItemId).toBe(`${type}_${rarity}`);
        expect(recipe.items).toEqual([
          {
            itemId: CRYSTAL_SYNTHESIS_SHARDS[type],
            quantity: CRYSTAL_SYNTHESIS_COSTS[rarity].shardQuantity,
          },
          { itemId: 'coin', quantity: CRYSTAL_SYNTHESIS_COSTS[rarity].coinQuantity },
        ]);
      }
    }
  });

  it('不足しているかけらと硬貨を返す', () => {
    const plan = planCrystalSynthesis('creation_crystal', 'R', {
      coin: 299,
      shard_sun: 14,
    });
    expect(plan.canSynthesize).toBe(false);
    expect(plan.missing).toEqual([
      { itemId: 'shard_sun', required: 15, owned: 14 },
      { itemId: 'coin', required: 300, owned: 299 },
    ]);
  });

  it('必要数ちょうどなら合成できる', () => {
    const plan = planCrystalSynthesis('exploration_crystal', 'SR', {
      coin: 800,
      shard_star: 30,
    });
    expect(plan.canSynthesize).toBe(true);
    expect(plan.missing).toEqual([]);
  });
});

describe('ストアの結晶合成', () => {
  it('成功時にかけらと硬貨を消費して結晶を1個追加する', () => {
    const store = createAppStore({
      storage: null,
      initialState: {
        ...initialAppState(),
        itemInventory: { coin: 100, shard_moon: 5 },
      },
    });

    expect(store.getState().synthesizeCrystal('knowledge_crystal', 'N')).toBe(true);

    const state = store.getState();
    expect(state.itemInventory).toEqual({ knowledge_crystal_N: 1 });
    expect(state.inventory.currency).toBe(0);
    expect(state.inventory.materials.shard_moon).toBe(0);

    const history = state.itemHistory.filter((entry) => entry.reason === 'synthesis');
    expect(history.map((entry) => [entry.itemId, entry.delta])).toEqual([
      ['shard_moon', -5],
      ['coin', -100],
      ['knowledge_crystal_N', 1],
    ]);
  });

  it('不足時は素材を消費せず、結晶も追加しない', () => {
    const store = createAppStore({
      storage: null,
      initialState: {
        ...initialAppState(),
        itemInventory: { coin: 99, shard_moon: 5 },
      },
    });

    expect(store.getState().synthesizeCrystal('knowledge_crystal', 'N')).toBe(false);

    const state = store.getState();
    expect(state.itemInventory).toEqual({ coin: 99, shard_moon: 5 });
    expect(state.itemHistory).toEqual([]);
  });
});
