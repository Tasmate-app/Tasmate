import {
  isValidAppState,
  normalizeAppState,
  type AppState,
} from './appState';

/**
 * プラットフォーム非依存の保存インターフェース。
 * Web は localStorage、Native は AsyncStorage をアダプタで包んで利用する。
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** AsyncStorage と互換性のある最小インターフェース */
export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const STORAGE_KEY = 'tasmate:state:v1';
export const LEGACY_STORAGE_KEY = 'study-quest:state:v1';
export const DEFAULT_SAVE_DEBOUNCE_MS = 150;

/** @react-native-async-storage/async-storage を StorageAdapter へ変換する */
export function createAsyncStorageAdapter(storage: AsyncStorageLike): StorageAdapter {
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '保存データの読み込みに失敗しました';
}

/**
 * 保存文字列を検証・正規化する。壊れた JSON や形式不正は null。
 * 既存フィールドは保持し、不足フィールドだけ normalizeAppState で補完する。
 */
export function parseStoredAppState(raw: string): AppState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidAppState(parsed)) return null;
    return normalizeAppState(parsed);
  } catch {
    return null;
  }
}

export interface AppStateLoadResult {
  state: AppState | null;
  /** 正規化後の保存文字列。直後の不要な再保存を避けるために使う */
  serialized: string | null;
  error: string | null;
  migratedFromLegacy: boolean;
  /** 保存先の読み込み自体に失敗した場合 true。既存データを上書きしてはいけない */
  readFailed: boolean;
}

export interface LoadAppStateOptions {
  storageKey?: string;
  legacyStorageKey?: string;
}

/**
 * 保存データを読み込む。主キーが無い場合のみ旧キーから移行する。
 * 読み込み失敗時も例外を投げず、呼び出し側が初期状態で起動できるようにする。
 */
export async function loadAppStateFromStorage(
  storage: StorageAdapter,
  options: LoadAppStateOptions = {},
): Promise<AppStateLoadResult> {
  const storageKey = options.storageKey ?? STORAGE_KEY;
  const legacyStorageKey = options.legacyStorageKey ?? LEGACY_STORAGE_KEY;

  try {
    const raw = await storage.getItem(storageKey);
    if (raw !== null) {
      const state = parseStoredAppState(raw);
      if (state === null) {
        return {
          state: null,
          serialized: null,
          error: '保存データの形式が不正のため初期状態で起動します',
          migratedFromLegacy: false,
          readFailed: false,
        };
      }
      return {
        state,
        serialized: JSON.stringify(state),
        error: null,
        migratedFromLegacy: false,
        readFailed: false,
      };
    }

    const legacyRaw = await storage.getItem(legacyStorageKey);
    if (legacyRaw === null) {
      return {
        state: null,
        serialized: null,
        error: null,
        migratedFromLegacy: false,
        readFailed: false,
      };
    }
    const legacy = parseStoredAppState(legacyRaw);
    if (legacy === null) {
      return {
        state: null,
        serialized: null,
        error: '旧保存データの形式が不正のため初期状態で起動します',
        migratedFromLegacy: false,
        readFailed: false,
      };
    }

    const serialized = JSON.stringify(legacy);
    let migrationError: string | null = null;
    try {
      await storage.setItem(storageKey, serialized);
      await storage.removeItem(legacyStorageKey);
    } catch (error) {
      migrationError = toErrorMessage(error);
    }
    return {
      state: legacy,
      serialized,
      error: migrationError,
      migratedFromLegacy: true,
      readFailed: false,
    };
  } catch (error) {
    return {
      state: null,
      serialized: null,
      error: toErrorMessage(error),
      migratedFromLegacy: false,
      readFailed: true,
    };
  }
}

/** 保存データを削除する */
export async function clearAppStateFromStorage(
  storage: StorageAdapter,
  options: LoadAppStateOptions = {},
): Promise<void> {
  const storageKey = options.storageKey ?? STORAGE_KEY;
  const legacyStorageKey = options.legacyStorageKey ?? LEGACY_STORAGE_KEY;
  await storage.removeItem(storageKey);
  await storage.removeItem(legacyStorageKey);
}
