/**
 * タイマー・セッションの時刻計算（純粋関数）。
 * 方針（AGENTS.md §9）:
 * - 一定間隔のカウントアップに依存せず、開始時刻を基準に経過時間を算出する
 * - ページ再読み込み・バックグラウンド化に対応するため、状態は localStorage に保存し、
 *   表示時にこの関数で再計算する
 */

/** 経過秒数を算出する。nowMs は Date.now() を渡す */
export function elapsedSeconds(
  startedAtMs: number,
  accumulatedSeconds: number,
  pausedAtMs: number | undefined,
  nowMs: number,
): number {
  const base = Math.max(0, accumulatedSeconds);
  if (pausedAtMs !== undefined) {
    return base + Math.max(0, (pausedAtMs - startedAtMs) / 1000);
  }
  return base + Math.max(0, (nowMs - startedAtMs) / 1000);
}

/** 秒を mm:ss / hh:mm:ss 形式に変換する */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 作業秒を課金対象の作業分に変換する（下限未満は 0 分） */
export function billableMinutes(elapsedSec: number, minimumBillableSeconds: number): number {
  if (!Number.isFinite(elapsedSec) || elapsedSec < minimumBillableSeconds) return 0;
  return elapsedSec / 60;
}

/** 中断から再開したセッションを含む、クエスト全体の累計作業秒数 */
export function totalElapsedSeconds(
  elapsedSec: number,
  carriedSeconds: number | undefined,
): number {
  return Math.max(0, carriedSeconds ?? 0) + Math.max(0, elapsedSec);
}

/** 見積タイマーの残り秒数。下限は 0 にクランプする */
export function remainingEstimateSeconds(
  estimatedMinutes: number,
  totalElapsedSec: number,
): number {
  const total = Math.max(0, estimatedMinutes) * 60;
  return Math.max(0, total - Math.max(0, totalElapsedSec));
}
