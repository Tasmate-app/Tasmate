import { describe, expect, it } from 'vitest';
import {
  billableMinutes,
  elapsedSeconds,
  formatElapsed,
  remainingEstimateSeconds,
  totalElapsedSeconds,
} from '../src/domain/session';

describe('elapsedSeconds', () => {
  it('開始時刻を基準に経過時間を算出する', () => {
    const startedAt = 1_000_000;
    const now = startedAt + 90_000;
    expect(elapsedSeconds(startedAt, 0, undefined, now)).toBeCloseTo(90, 5);
  });

  it('一時停止中は pausedAt で固定される', () => {
    const startedAt = 1_000_000;
    const pausedAt = startedAt + 60_000;
    const muchLater = pausedAt + 3_600_000;
    expect(elapsedSeconds(startedAt, 0, pausedAt, muchLater)).toBeCloseTo(60, 5);
  });

  it('再開後の蓄積秒数に加算される', () => {
    const firstStart = 1_000_000;
    const pausedAt = firstStart + 60_000;
    const acc = elapsedSeconds(firstStart, 0, pausedAt, pausedAt);
    const secondStart = pausedAt + 600_000; // 10分の中断
    const now = secondStart + 30_000;
    expect(elapsedSeconds(secondStart, acc, undefined, now)).toBeCloseTo(90, 5);
  });
});

describe('formatElapsed', () => {
  it('mm:ss 形式で表示する', () => {
    expect(formatElapsed(65)).toBe('1:05');
    expect(formatElapsed(5)).toBe('0:05');
  });

  it('1時間以上は hh:mm:ss 形式になる', () => {
    expect(formatElapsed(3661)).toBe('1:01:01');
  });
});

describe('billableMinutes', () => {
  it('下限未満は0分になる', () => {
    expect(billableMinutes(30, 60)).toBe(0);
    expect(billableMinutes(90, 60)).toBeCloseTo(1.5, 5);
  });
});

describe('中断再開の累計時間', () => {
  it('引き継ぎ秒数と現在の区間を合算する', () => {
    expect(totalElapsedSeconds(300, 600)).toBe(900);
    expect(totalElapsedSeconds(300, undefined)).toBe(300);
    expect(totalElapsedSeconds(-10, -10)).toBe(0);
  });

  it('見積タイマーの残り時間を0以上で返す', () => {
    expect(remainingEstimateSeconds(25, 600)).toBe(900);
    expect(remainingEstimateSeconds(25, 1500)).toBe(0);
    expect(remainingEstimateSeconds(25, 1800)).toBe(0);
  });
});
