import { describe, expect, it } from 'vitest';
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  MAX_BACKUP_FILE_BYTES,
  backupFileName,
  createBackup,
  initialAppState,
  parseBackup,
  serializeBackup,
  toAppStateSnapshot,
  type AppState,
} from '@tasmate/core';

const NOW = new Date('2026-11-12T09:30:00.000Z');

function makeState(): AppState {
  const state = initialAppState();
  state.tasks = [
    {
      id: 'task-1',
      title: 'バックアップ対象のタスク',
      description: '',
      category: '勉強',
      estimatedMinutes: 25,
      scheduledDate: '2026-11-12',
      status: 'planned',
      createdAt: '2026-11-12T08:00:00.000Z',
      updatedAt: '2026-11-12T08:00:00.000Z',
    },
  ];
  state.activeSession = {
    id: 'session-1',
    taskId: 'task-1',
    startedAt: '2026-11-12T09:00:00.000Z',
    accumulatedSeconds: 120,
    state: 'running',
    destinationId: 'd-hills',
    assignedCharacterIds: ['c-hinata'],
  };
  state.restSession = {
    id: 'rest-1',
    startedAt: '2026-11-12T09:10:00.000Z',
    plannedMinutes: 5,
    state: 'active',
  };
  state.settings = { lastBackupAt: '2026-01-01T00:00:00.000Z' };
  return state;
}

describe('createBackup', () => {
  it('進行中のセッションと休憩を除外し、最終バックアップ日時を記録する', () => {
    const state = makeState();

    const backup = createBackup(state, NOW);

    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(backup.exportedAt).toBe(NOW.toISOString());
    expect(backup.state.activeSession).toBeNull();
    expect(backup.state.restSession).toBeNull();
    expect(backup.state.settings.lastBackupAt).toBe(NOW.toISOString());
    expect(backup.state.tasks).toHaveLength(1);
  });

  it('元の状態を変更しない', () => {
    const state = makeState();

    createBackup(state, NOW);

    expect(state.activeSession).not.toBeNull();
    expect(state.restSession).not.toBeNull();
    expect(state.settings.lastBackupAt).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('parseBackup', () => {
  it('書き出したバックアップを復元する', () => {
    const raw = serializeBackup(makeState(), NOW);

    const result = parseBackup(raw, new Date('2027-01-01T00:00:00.000Z'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.exportedAt).toBe(NOW.toISOString());
    expect(result.state.activeSession).toBeNull();
    expect(result.state.restSession).toBeNull();
    expect(result.state.tasks[0]?.title).toBe('バックアップ対象のタスク');
    expect(result.state.settings.lastBackupAt).toBe(NOW.toISOString());
  });

  it('旧形式の AppState を読み込み、進行中セッションを破棄する', () => {
    const raw = JSON.stringify(toAppStateSnapshot(makeState()));

    const result = parseBackup(raw, NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.exportedAt).toBeNull();
    expect(result.state.activeSession).toBeNull();
    expect(result.state.restSession).toBeNull();
    expect(result.state.settings.lastBackupAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('JSON として不正なデータを拒否する', () => {
    const result = parseBackup('{', NOW);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('JSON');
  });

  it('対応していないバックアップ形式を拒否する', () => {
    const raw = JSON.stringify({
      format: 'other-backup',
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: NOW.toISOString(),
      state: makeState(),
    });

    const result = parseBackup(raw, NOW);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('対応していない');
  });

  it('exportedAt が日時でないバックアップを拒否する', () => {
    const raw = JSON.stringify({
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: 'not-a-date',
      state: makeState(),
    });

    const result = parseBackup(raw, NOW);

    expect(result.ok).toBe(false);
  });

  it('Tasmate のバックアップではないデータを拒否する', () => {
    const result = parseBackup(JSON.stringify({ version: 1, tasks: 'invalid' }), NOW);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('Tasmate');
  });

  it('大きすぎるファイルを拒否する', () => {
    const result = parseBackup('x'.repeat(MAX_BACKUP_FILE_BYTES + 1), NOW);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('大きすぎ');
  });
});

describe('backupFileName', () => {
  it('ローカル日時からファイル名を作る', () => {
    expect(backupFileName(new Date(2026, 0, 2, 3, 4, 5))).toBe(
      'tasmate-backup-20260102-030405.json',
    );
  });
});
