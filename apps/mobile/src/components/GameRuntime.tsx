import { useEffect } from 'react';
import { AppState } from 'react-native';
import { isRestDue, weekStartKey } from '@tasmate/core';
import { useNow } from '../hooks/useNow';
import { useMobileAppStore } from '../stores/appStore';

export function GameRuntime() {
  useWeeklyEvaluationWatcher();
  useRestCompletionWatcher();
  useLongWorkWatcher();
  useBackgroundFlush();
  return null;
}

function useWeeklyEvaluationWatcher() {
  useEffect(() => {
    const run = () => {
      const store = useMobileAppStore.getState();
      store.evaluateDueWeeks();
      store.ensureRecurringOccurrencesForWeek(weekStartKey(new Date()));
    };

    run();
    const timer = setInterval(run, 60_000);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') run();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
}

function useRestCompletionWatcher() {
  const restSession = useMobileAppStore((s) => s.restSession);
  const completeRest = useMobileAppStore((s) => s.completeRest);
  const now = useNow(1000, restSession?.state === 'active');

  useEffect(() => {
    if (restSession !== null && isRestDue(restSession, now)) {
      completeRest();
    }
  }, [restSession, now, completeRest]);
}

function useLongWorkWatcher() {
  const activeSession = useMobileAppStore((s) => s.activeSession);
  const checkLongWorkSupport = useMobileAppStore((s) => s.checkLongWorkSupport);
  const isRunning = activeSession?.state === 'running';
  const now = useNow(10_000, isRunning);

  useEffect(() => {
    if (isRunning) checkLongWorkSupport();
  }, [now, isRunning, activeSession?.id, checkLongWorkSupport]);
}

function useBackgroundFlush() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'background' || status === 'inactive') {
        void useMobileAppStore.getState().flush();
      }
    });
    return () => subscription.remove();
  }, []);
}
