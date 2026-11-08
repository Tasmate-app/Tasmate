import { createAppStore, toAppStateSnapshot } from '@tasmate/core';
import {
  didLastAppStateReadFail,
  loadAppState,
  saveAppState,
  webStorageAdapter,
} from '../services/storage';

/**
 * Web版のストア。
 * localStorage は同期読み込みできるため、初回描画前に復元を完了させる。
 */
const hasWindow = typeof window !== 'undefined';
const initialState = loadAppState();

export const useAppStore = createAppStore({
  storage: hasWindow ? webStorageAdapter : null,
  initialState,
  canPersist: !didLastAppStateReadFail(),
});

if (hasWindow) {
  // 非同期保存の完了を待てない終了時だけ、同期保存で取りこぼしを防ぐ
  window.addEventListener('beforeunload', () => {
    saveAppState(toAppStateSnapshot(useAppStore.getState()));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void useAppStore.getState().flush();
    }
  });
}

export {
  createAppStore,
  currentWeeklyMultiplier,
  sessionElapsedSeconds,
  summarizeCurrentWeek,
} from '@tasmate/core';
export type {
  AppActions,
  AppStore,
  CreateAppStoreOptions,
  RecurrenceRuleInput,
  TaskInput,
} from '@tasmate/core';
