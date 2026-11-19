import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import { isRestDue, weekStartKey } from '@tasmate/core';
import { useNow } from '../hooks/useNow';
import { useMobileAppStore } from '../stores/appStore';
import {
  consumeInitialTaskNotificationResponse,
  getNotificationPermissionInfo,
  requestNotificationPermission,
  subscribeToTaskNotificationResponses,
  syncTaskNotifications,
} from '../services/taskNotifications';

export function GameRuntime() {
  useWeeklyEvaluationWatcher();
  useRestCompletionWatcher();
  useLongWorkWatcher();
  useBackgroundFlush();
  useTaskNotificationSync();
  useTaskNotificationRouting();
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

function useTaskNotificationSync() {
  const tasks = useMobileAppStore((s) => s.tasks);
  const settings = useMobileAppStore((s) => s.settings.notifications);
  const initialPermissionChecked = useRef(false);

  useEffect(() => {
    if (initialPermissionChecked.current) return;
    initialPermissionChecked.current = true;
    const current = useMobileAppStore.getState().settings.notifications;
    if (!current.enabled) return;
    void (async () => {
      const permission = await getNotificationPermissionInfo();
      if (permission.status === 'undetermined' && permission.canAskAgain) {
        await requestNotificationPermission();
      }
      const state = useMobileAppStore.getState();
      await syncTaskNotifications({
        tasks: state.tasks,
        settings: state.settings.notifications,
      });
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      void syncTaskNotifications({ tasks, settings });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tasks, settings]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status !== 'active') return;
      const state = useMobileAppStore.getState();
      void syncTaskNotifications({
        tasks: state.tasks,
        settings: state.settings.notifications,
      });
    });
    return () => subscription.remove();
  }, []);
}

function useTaskNotificationRouting() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const ready = navigationState?.key !== undefined;

  useEffect(() => {
    if (!ready) return;
    if (consumeInitialTaskNotificationResponse() !== null) {
      router.push('/');
    }
    return subscribeToTaskNotificationResponses(() => {
      router.push('/');
    });
  }, [ready, router]);
}
