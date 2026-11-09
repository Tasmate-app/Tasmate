import { describe, expect, it } from 'vitest';
import type { OwnedCharacter } from '@tasmate/types';
import {
  addItems,
  consumeItems,
  getItemQuantity,
  itemInventoryFromLegacy,
  legacyInventoryFromItems,
  planAscension,
  planLevelUp,
} from '../packages/core/src/index';

describe('共通インベントリ', () => {
  it('不足がある場合は一部だけ消費せず失敗する', () => {
    const result = consumeItems(
      { coin: 100, stardust: 1 },
      [
        { itemId: 'coin', quantity: 80 },
        { itemId: 'stardust', quantity: 2 },
      ],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual([{ itemId: 'stardust', required: 2, owned: 1 }]);
    }
  });

  it('複数スタックを合算して消費する', () => {
    const result = consumeItems(
      { knowledge_crystal_N: 2, thought_crystal_N: 2 },
      [
        { itemId: 'knowledge_crystal_N', quantity: 1 },
        { itemId: 'knowledge_crystal_N', quantity: 1 },
      ],
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(getItemQuantity(result.inventory, 'knowledge_crystal_N')).toBe(0);
      expect(getItemQuantity(result.inventory, 'thought_crystal_N')).toBe(2);
    }
  });

  it('旧 Inventory から新インベントリを補完し、逆同期できる', () => {
    const items = itemInventoryFromLegacy({
      currency: 120,
      materials: { shard_sun: 3, shard_moon: 1, shard_star: 0 },
    });
    expect(items).toEqual({ coin: 120, shard_sun: 3, shard_moon: 1 });

    const withStardust = addItems(items, [{ itemId: 'stardust', quantity: 4 }]);
    expect(
      legacyInventoryFromItems(withStardust, {
        currency: 0,
        materials: { shard_sun: 0, shard_moon: 0, shard_star: 0 },
      }),
    ).toEqual({
      currency: 120,
      materials: { shard_sun: 3, shard_moon: 1, shard_star: 0 },
    });
  });
});

describe('育成ロジック', () => {
  it('通常レベルアップは経験値・硬貨・星屑を必要とする', () => {
    const character: OwnedCharacter = { definitionId: 'c-hinata', level: 1, experience: 100 };
    expect(planLevelUp(character, { coin: 49, stardust: 10 }).canLevelUp).toBe(false);
    const plan = planLevelUp(character, { coin: 50, stardust: 1 });
    expect(plan.canLevelUp).toBe(true);
    expect(plan.maxLevel).toBe(20);
    expect(plan.items).toEqual([
      { itemId: 'coin', quantity: 50 },
      { itemId: 'stardust', quantity: 1 },
    ]);
  });

  it('上限レベルではレベルアップできない', () => {
    const character: OwnedCharacter = { definitionId: 'c-hinata', level: 20, experience: 9999 };
    expect(planLevelUp(character, { coin: 99999, stardust: 99999 }).canLevelUp).toBe(false);
  });

  it('上限解放は同レアリティ結晶・専用素材・硬貨を要求する', () => {
    const character: OwnedCharacter = { definitionId: 'c-hinata', level: 20, experience: 0 };
    const plan = planAscension(character, {
      knowledge_crystal_N: 1,
      thought_crystal_N: 2,
      sun_feather: 3,
      coin: 200,
    });
    expect(plan.requirement).toMatchObject({
      stage: 1,
      fromMaxLevel: 20,
      toMaxLevel: 30,
      crystals: { rarity: 'N', quantity: 3 },
      characterMaterial: { itemId: 'sun_feather', quantity: 3 },
      coins: 200,
    });
    expect(plan.canAscend).toBe(true);
  });

  it('レベルが上限未満なら素材が揃っていても上限解放できない', () => {
    const character: OwnedCharacter = { definitionId: 'c-hinata', level: 19, experience: 0 };
    const plan = planAscension(character, {
      knowledge_crystal_N: 3,
      sun_feather: 3,
      coin: 200,
    });
    expect(plan.canAscend).toBe(false);
  });

  it('未定義キャラクターは専用素材を要求できない', () => {
    const character: OwnedCharacter = { definitionId: 'unknown', level: 20, experience: 0 };
    expect(planAscension(character, { coin: 99999 }).requirement).toBeNull();
  });
});
