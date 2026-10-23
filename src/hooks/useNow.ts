import { useEffect, useState } from 'react';

/**
 * 現在時刻を一定間隔で再取得するフック。
 * タイマー表示の再レンダリング専用であり、経過時間の算出は
 * 開始時刻を基準とする domain/session.ts の関数で行う。
 */
export function useNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, enabled]);
  return now;
}
