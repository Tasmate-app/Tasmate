import {
  isValidAppState,
  normalizeAppState,
  toAppStateSnapshot,
  type AppState,
} from './appState';

export const BACKUP_FORMAT = 'tasmate-backup';
export const BACKUP_FORMAT_VERSION = 1;
export const MAX_BACKUP_FILE_BYTES = 5 * 1024 * 1024;

export interface TasmateBackup {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  state: AppState;
}

export type BackupParseResult =
  | { ok: true; state: AppState; exportedAt: string | null }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBackupPayload(value: unknown): value is TasmateBackup {
  return (
    isRecord(value) &&
    value['format'] === BACKUP_FORMAT &&
    value['formatVersion'] === BACKUP_FORMAT_VERSION &&
    typeof value['exportedAt'] === 'string' &&
    !Number.isNaN(Date.parse(value['exportedAt'])) &&
    isValidAppState(value['state'])
  );
}

function clearTransientSessions(state: AppState): AppState {
  return state.activeSession === null && state.restSession === null
    ? state
    : { ...state, activeSession: null, restSession: null };
}

function restoreState(state: AppState, exportedAt: string | null, now: Date): AppState {
  const normalized = clearTransientSessions(normalizeAppState(state, now));
  if (exportedAt === null) return normalized;
  return {
    ...normalized,
    settings: { ...normalized.settings, lastBackupAt: exportedAt },
  };
}

/** バックアップ用のスナップショットを作る。進行中のタイマー・休憩は含めない */
export function createBackup(state: AppState, now: Date = new Date()): TasmateBackup {
  const exportedAt = now.toISOString();
  const snapshot = clearTransientSessions(toAppStateSnapshot(state));
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    state: {
      ...snapshot,
      settings: { ...snapshot.settings, lastBackupAt: exportedAt },
    },
  };
}

export function serializeBackup(state: AppState, now: Date = new Date()): string {
  return JSON.stringify(createBackup(state, now), null, 2);
}

export function parseBackup(raw: string, now: Date = new Date()): BackupParseResult {
  if (raw.length > MAX_BACKUP_FILE_BYTES) {
    return { ok: false, error: 'バックアップファイルが大きすぎます' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'JSONとして読み込めませんでした' };
  }

  if (isBackupPayload(parsed)) {
    return {
      ok: true,
      state: restoreState(parsed.state, parsed.exportedAt, now),
      exportedAt: parsed.exportedAt,
    };
  }

  if (isRecord(parsed) && ('format' in parsed || 'formatVersion' in parsed)) {
    return { ok: false, error: '対応していないバックアップ形式です' };
  }

  if (!isValidAppState(parsed)) {
    return { ok: false, error: 'Tasmateのバックアップデータではありません' };
  }

  const state = restoreState(parsed, null, now);
  return { ok: true, state, exportedAt: null };
}

export function backupFileName(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `tasmate-backup-${date}-${time}.json`;
}
