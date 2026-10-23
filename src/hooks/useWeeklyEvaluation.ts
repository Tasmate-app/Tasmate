import { useEffect } from 'react';
import { weekStartKey } from '../domain/weekly';
import { useAppStore } from '../stores/appStore';

/**
 * 週次判定と繰り返し予定の生成をアプリ起動時・復帰時に実行する。
 * 画面を開いたときだけに依存せず、未判定週を古い順に処理する。
 */
export function useWeeklyEvaluation(): void {
  useEffect(() => {
    const run = () => {
      const store = useAppStore.getState();
      store.evaluateDueWeeks();
      store.ensureRecurringOccurrencesForWeek(weekStartKey(new Date()));
    };

    run();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    const timer = window.setInterval(run, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(timer);
    };
  }, []);
}
