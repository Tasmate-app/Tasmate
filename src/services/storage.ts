import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  initialAppState,
  parseStoredAppState,
  type AppState,
  type StorageAdapter,
} from '@tasmate/core';

export { LEGACY_STORAGE_KEY, STORAGE_KEY };

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Web用のStorageAdapter。
 * 書き込みは同期的に実行してからPromiseを返すため、beforeunload時のflushでも失われにくい。
 */
export const webStorageAdapter: StorageAdapter = {
  async getItem(key) {
    return getLocalStorage()?.getItem(key) ?? null;
  },
  async setItem(key, value) {
    getLocalStorage()?.setItem(key, value);
  },
  async removeItem(key) {
    getLocalStorage()?.removeItem(key);
  },
};

/**
 * Web版の同期読み込み。
 * 既存の localStorage キー・JSON構造をそのまま利用する。
 */
export function loadAppState(): AppState {
  try {
    const storage = getLocalStorage();
    if (storage === null) return initialAppState();

    const raw = storage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const state = parseStoredAppState(raw);
      if (state !== null) return state;
      console.warn('[storage] 保存データの形式が不正のため初期状態で起動します');
      return initialAppState();
    }

    const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw === null) return initialAppState();
    const legacy = parseStoredAppState(legacyRaw);
    if (legacy === null) {
      console.warn('[storage] 保存データの形式が不正のため初期状態で起動します');
      return initialAppState();
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    storage.removeItem(LEGACY_STORAGE_KEY);
    return legacy;
  } catch (error) {
    console.warn('[storage] 保存データの読み込みに失敗したため初期状態で起動します', error);
    return initialAppState();
  }
}

/** Web版の同期保存（beforeunload など、非同期完了を待てない場面用） */
export function saveAppState(state: AppState): void {
  try {
    getLocalStorage()?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[storage] 保存に失敗しました（容量不足の可能性）', error);
  }
}

export function clearAppState(): void {
  try {
    const storage = getLocalStorage();
    storage?.removeItem(STORAGE_KEY);
    storage?.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    console.warn('[storage] 削除に失敗しました', error);
  }
}
