import type { ItemRarity, TaskDifficulty } from '@tasmate/types';

/**
 * 難易度ごとの結晶レアリティ抽選表（合計100）。
 * タスク評価は難易度のみを返し、レアリティはプログラム側で抽選する。
 */
export const CRYSTAL_RARITY_TABLE: Record<TaskDifficulty, Record<ItemRarity, number>> = {
  1: { N: 70, R: 25, SR: 5, SSR: 0, UR: 0 },
  2: { N: 50, R: 30, SR: 15, SSR: 5, UR: 0 },
  3: { N: 30, R: 35, SR: 22, SSR: 10, UR: 3 },
  4: { N: 15, R: 30, SR: 30, SSR: 20, UR: 5 },
  5: { N: 5, R: 20, SR: 32, SSR: 30, UR: 13 },
};

const RARITY_ORDER: readonly ItemRarity[] = ['N', 'R', 'SR', 'SSR', 'UR'];

/** 0..1 の乱数からレアリティを決める。重みが0のレアリティは出ない */
export function pickRarity(difficulty: TaskDifficulty, roll: number): ItemRarity {
  const table = CRYSTAL_RARITY_TABLE[difficulty];
  const normalized = Math.max(0, Math.min(0.999999, Number.isFinite(roll) ? roll : 0));
  const threshold = normalized * 100;
  let cumulative = 0;
  for (const rarity of RARITY_ORDER) {
    cumulative += table[rarity];
    if (threshold < cumulative) return rarity;
  }
  return 'N';
}

/** レアリティ選択の累積閾値（テスト・表示用） */
export function rarityThresholds(difficulty: TaskDifficulty): Array<{ rarity: ItemRarity; upTo: number }> {
  const table = CRYSTAL_RARITY_TABLE[difficulty];
  let cumulative = 0;
  return RARITY_ORDER.map((rarity) => {
    cumulative += table[rarity];
    return { rarity, upTo: cumulative };
  });
}
