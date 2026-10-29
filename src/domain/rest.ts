import { BALANCE } from './constants';
import type { RestSession, SupportEventKind } from '../types/index';

/** 休憩時間のプリセット（分） */
export const REST_PRESET_MINUTES = [5, 10, 15, 20, 30] as const;

/** 作業時間に応じた休憩の推奨時間を返す */
export function recommendedRestMinutes(workMinutes: number): number {
  if (!Number.isFinite(workMinutes) || workMinutes < 0) return 5;
  for (const threshold of BALANCE.restSuggestionThresholds) {
    if (workMinutes >= threshold.workMinutes) return threshold.restMinutes;
  }
  return 5;
}

/** プレイヤーが入力した休憩時間を有効範囲に丸める */
export function clampRestMinutes(value: number): number {
  if (!Number.isFinite(value)) return BALANCE.minRestMinutes;
  const rounded = Math.round(value);
  return Math.min(BALANCE.maxRestMinutes, Math.max(BALANCE.minRestMinutes, rounded));
}

/** 休憩の終了予定時刻（ミリ秒）。開始時刻が不正なら NaN */
export function restEndsAtMs(session: RestSession): number {
  const startedMs = Date.parse(session.startedAt);
  if (!Number.isFinite(startedMs)) return Number.NaN;
  return startedMs + clampRestMinutes(session.plannedMinutes) * 60_000;
}

/** 設定した休憩時間が経過したか */
export function isRestDue(session: RestSession, nowMs: number): boolean {
  if (session.state !== 'active') return false;
  const endsAt = restEndsAtMs(session);
  return Number.isFinite(endsAt) && nowMs >= endsAt;
}

/** 休憩の残り秒数（0 未満にはならない） */
export function remainingRestSeconds(session: RestSession, nowMs: number): number {
  if (session.state !== 'active') return 0;
  const endsAt = restEndsAtMs(session);
  if (!Number.isFinite(endsAt)) return 0;
  return Math.max(0, Math.ceil((endsAt - nowMs) / 1000));
}

/** 作業後の休憩が完了しているか */
export function hasCompletedRestAfter(
  previousEndedAtMs: number,
  session: RestSession | null,
): boolean {
  if (session === null || session.state !== 'completed' || session.endedAt === undefined) {
    return false;
  }
  const restEndedMs = Date.parse(session.endedAt);
  return Number.isFinite(restEndedMs) && restEndedMs >= previousEndedAtMs;
}

export interface ConsecutiveWorkCheck {
  previousSessionEndedAt?: string;
  nowMs: number;
  restSession: RestSession | null;
  windowMinutes?: number;
}

/**
 * 直前の作業から間を置かず、休憩も完了せずに次の作業を始めたか。
 * 「連続で作業しなければならない」状況を検出し、応援イベントのきっかけにする。
 */
export function isConsecutiveWork(check: ConsecutiveWorkCheck): boolean {
  const previousEndedMs =
    check.previousSessionEndedAt !== undefined
      ? Date.parse(check.previousSessionEndedAt)
      : Number.NaN;
  if (!Number.isFinite(previousEndedMs)) return false;

  const windowMinutes = check.windowMinutes ?? BALANCE.consecutiveWorkWindowMinutes;
  if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) return false;
  const gapMs = check.nowMs - previousEndedMs;
  if (gapMs < 0 || gapMs > windowMinutes * 60_000) return false;

  return !hasCompletedRestAfter(previousEndedMs, check.restSession);
}

/** 応援イベントのセリフを生成する */
export function supportMessage(kind: SupportEventKind, characterName: string): string {
  switch (kind) {
    case 'consecutive-work':
      return `${characterName}「ここまでよくがんばったね！続けてえらいけど、合間の休憩も大切だよ。応援してる！」`;
    case 'long-work':
      return `${characterName}「長時間集中できてるね！水分補給と軽い休憩を忘れずに。無理しすぎないでね」`;
    case 'rest-complete':
      return `${characterName}「休憩おつかれさま！頭がすっきりしたね。次のクエストもいっしょにがんばろう」`;
  }
}
