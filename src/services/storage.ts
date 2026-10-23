import { initialAppState, isValidAppState, type AppState } from './appState';

const STORAGE_KEY = 'tasmate:state:v1';
const LEGACY_STORAGE_KEY = 'study-quest:state:v1';

/**
 * データ保存層（MVP は localStorage）。
 * UI・ストアは localStorage を直接触らず、このモジュール経由で読み書きする。
 * 将来 Supabase へ移行する際は、このモジュールの実装を差し替える。
 */
export function loadAppState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (!isValidAppState(parsed)) {
        console.warn('[storage] 保存データの形式が不正のため初期状態で起動します');
        return initialAppState();
      }
      return parsed;
    }
    // 旧サービス名の保存データを引き継ぐ（名称変更時の移行用）
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw === null) return initialAppState();
    const legacyParsed: unknown = JSON.parse(legacyRaw);
    if (!isValidAppState(legacyParsed)) {
      console.warn('[storage] 保存データの形式が不正のため初期状態で起動します');
      return initialAppState();
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyParsed));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return legacyParsed;
  } catch (error) {
    console.warn('[storage] 保存データの読み込みに失敗したため初期状態で起動します', error);
    return initialAppState();
  }
}

export function saveAppState(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[storage] 保存に失敗しました（容量不足の可能性）', error);
  }
}

export function clearAppState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    console.warn('[storage] 削除に失敗しました', error);
  }
}
