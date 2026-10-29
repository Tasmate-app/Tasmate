import { describe, expect, it } from 'vitest';
import {
  clampRestMinutes,
  isConsecutiveWork,
  isRestDue,
  recommendedRestMinutes,
  remainingRestSeconds,
  restEndsAtMs,
} from '../src/domain/rest';
import type { RestSession } from '../src/types/index';

const START = Date.parse('2026-01-01T10:00:00.000Z');

function makeRest(overrides: Partial<RestSession> = {}): RestSession {
  return {
    id: 'rest-1',
    startedAt: new Date(START).toISOString(),
    plannedMinutes: 10,
    sourceSessionId: 'session-1',
    state: 'active',
    ...overrides,
  };
}

describe('recommendedRestMinutes', () => {
  it('作業時間が長いほど休憩を長く提案する', () => {
    expect(recommendedRestMinutes(10)).toBe(5);
    expect(recommendedRestMinutes(25)).toBe(10);
    expect(recommendedRestMinutes(50)).toBe(15);
    expect(recommendedRestMinutes(90)).toBe(20);
    expect(recommendedRestMinutes(240)).toBe(20);
  });

  it('不正な作業時間は最短の休憩を返す', () => {
    expect(recommendedRestMinutes(Number.NaN)).toBe(5);
    expect(recommendedRestMinutes(-10)).toBe(5);
  });
});

describe('clampRestMinutes', () => {
  it('設定可能な範囲に丸める', () => {
    expect(clampRestMinutes(0)).toBe(1);
    expect(clampRestMinutes(61)).toBe(60);
    expect(clampRestMinutes(12.6)).toBe(13);
    expect(clampRestMinutes(Number.NaN)).toBe(1);
  });
});

describe('休息時間の計算', () => {
  it('開始時刻と設定時間から終了予定を求める', () => {
    expect(restEndsAtMs(makeRest())).toBe(START + 10 * 60_000);
  });

  it('設定時間が経過するまで休憩完了にならない', () => {
    const rest = makeRest();
    expect(isRestDue(rest, START + 9 * 60_000)).toBe(false);
    expect(remainingRestSeconds(rest, START + 9 * 60_000)).toBe(60);
    expect(isRestDue(rest, START + 10 * 60_000)).toBe(true);
    expect(remainingRestSeconds(rest, START + 10 * 60_000)).toBe(0);
  });

  it('完了済みの休憩は再度完了扱いにならない', () => {
    const rest = makeRest({ state: 'completed', endedAt: new Date(START + 600_000).toISOString() });
    expect(isRestDue(rest, START + 20 * 60_000)).toBe(false);
  });
});

describe('isConsecutiveWork', () => {
  const previousEndedAt = new Date(START).toISOString();

  it('直前に作業を終え、休憩せずに始めると連続作業になる', () => {
    expect(
      isConsecutiveWork({
        previousSessionEndedAt: previousEndedAt,
        nowMs: START + 5 * 60_000,
        restSession: null,
      }),
    ).toBe(true);
  });

  it('休憩を完了してから始めた場合は連続作業にならない', () => {
    const rest = makeRest({
      state: 'completed',
      endedAt: new Date(START + 3 * 60_000).toISOString(),
    });
    expect(
      isConsecutiveWork({
        previousSessionEndedAt: previousEndedAt,
        nowMs: START + 5 * 60_000,
        restSession: rest,
      }),
    ).toBe(false);
  });

  it('前回の作業より前に終えた休憩は数えない', () => {
    const rest = makeRest({
      state: 'completed',
      endedAt: new Date(START - 10 * 60_000).toISOString(),
    });
    expect(
      isConsecutiveWork({
        previousSessionEndedAt: previousEndedAt,
        nowMs: START + 5 * 60_000,
        restSession: rest,
      }),
    ).toBe(true);
  });

  it('休憩中に次の作業を始めた場合は連続作業になる', () => {
    expect(
      isConsecutiveWork({
        previousSessionEndedAt: previousEndedAt,
        nowMs: START + 5 * 60_000,
        restSession: makeRest(),
      }),
    ).toBe(true);
  });

  it('時間が空いた場合や直前の作業がない場合は連続作業にならない', () => {
    expect(
      isConsecutiveWork({
        previousSessionEndedAt: previousEndedAt,
        nowMs: START + 40 * 60_000,
        restSession: null,
      }),
    ).toBe(false);
    expect(
      isConsecutiveWork({ previousSessionEndedAt: undefined, nowMs: START, restSession: null }),
    ).toBe(false);
  });
});
