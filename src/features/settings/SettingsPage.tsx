import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  backupFileName,
  serializeBackup,
} from '@tasmate/core';
import packageInfo from '../../../package.json';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, TextInput } from '../../components/ui/Field';
import { downloadTextFile, readTextFile } from '../../services/backupFile';
import { useAppStore } from '../../stores/appStore';

function formatBackupDate(value: string | null): string {
  if (value === null) return '未実施';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '不明';
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 設定画面。データ管理・アプリ情報・ライセンス導線をまとめる */
export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const canPersist = useAppStore((s) => s.canPersist);
  const importAppState = useAppStore((s) => s.importAppState);
  const markBackupExported = useAppStore((s) => s.markBackupExported);
  const resetAll = useAppStore((s) => s.resetAll);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  useEffect(() => {
    if (!resetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setResetOpen(false);
        setResetConfirmText('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetOpen]);

  const clearFeedback = () => {
    setMessage('');
    setError('');
  };

  const handleExport = () => {
    clearFeedback();
    setBusy(true);
    try {
      const now = new Date();
      const fileName = backupFileName(now);
      downloadTextFile(fileName, serializeBackup(useAppStore.getState(), now));
      markBackupExported(now.toISOString());
      setMessage(`バックアップを書き出しました（${fileName}）。`);
    } catch {
      setError('バックアップの書き出しに失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;
    clearFeedback();
    setBusy(true);
    try {
      const raw = await readTextFile(file);
      const result = importAppState(raw);
      if (!result.ok) {
        setError(`復元できませんでした。${result.error}`);
        return;
      }
      setMessage(
        'バックアップを復元しました。進行中のタイマーと休憩は解除されています。',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'バックアップの読み込みに失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    if (resetConfirmText !== 'リセット') return;
    resetAll();
    setResetOpen(false);
    setResetConfirmText('');
    setError('');
    setMessage('すべてのデータをリセットしました。');
  };

  return (
    <div className="game-container settings-page">
      <header className="game-screen__head">
        <div>
          <p className="eyebrow">SETTINGS</p>
          <h1 className="game-screen__title">設定</h1>
          <p className="settings-lead">
            データのバックアップとアプリ情報を管理します。作業記録はこの端末内に保存されます。
          </p>
        </div>
      </header>

      {!canPersist && (
        <div className="settings-warning" role="alert">
          保存データを読み込めなかったため、この起動ではデータを保存できません。復元・リセットは利用できません。
        </div>
      )}

      <div className="page-grid page-grid--two">
        <Card title="データ管理">
          <div className="settings-info">
            <div>
              <span>最終バックアップ</span>
              <strong>{formatBackupDate(settings.lastBackupAt)}</strong>
            </div>
            <div>
              <span>保存先</span>
              <strong>このブラウザ（localStorage）</strong>
            </div>
          </div>

          <p className="settings-note">
            バックアップには進行中のタイマーと休憩は含まれません。復元すると現在のデータはすべて上書きされます。
          </p>

          <div className="btn-row settings-actions">
            <Button onClick={handleExport} disabled={busy}>
              バックアップを書き出す
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy || !canPersist}
            >
              バックアップから復元
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="settings-file-input"
              onChange={handleImportFile}
              aria-label="復元するバックアップファイルを選択"
            />
          </div>

          <div className="settings-danger">
            <div>
              <h3>すべてのデータをリセット</h3>
              <p className="settings-note">
                タスク・履歴・キャラクター・施設・設定を含むすべてのデータを初期状態に戻します。元に戻せません。
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => {
                clearFeedback();
                setResetOpen(true);
              }}
              disabled={busy || !canPersist}
            >
              リセット
            </Button>
          </div>

          {message !== '' && (
            <p className="settings-message" role="status">
              {message}
            </p>
          )}
          {error !== '' && (
            <p className="settings-error" role="alert">
              {error}
            </p>
          )}
        </Card>

        <Card title="アプリ情報">
          <dl className="settings-info">
            <div>
              <dt>アプリ名</dt>
              <dd>Tasmate</dd>
            </div>
            <div>
              <dt>バージョン</dt>
              <dd>{packageInfo.version}</dd>
            </div>
            <div>
              <dt>データ保存</dt>
              <dd>ローカル保存（アカウント同期なし）</dd>
            </div>
            <div>
              <dt>OSSライセンス</dt>
              <dd>
                <Badge tone="warning">準備中</Badge>
                依存ライブラリのライセンス一覧は #23 で追加予定です。
              </dd>
            </div>
          </dl>
          <p className="settings-note">
            バックアップファイルは外部に送信されません。必要な場合はご自身で安全な場所に保管してください。
          </p>
        </Card>
      </div>

      {resetOpen && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => {
            setResetOpen(false);
            setResetConfirmText('');
          }}
        >
          <section
            className="modal settings-reset-modal"
            role="dialog"
            aria-modal="true"
            aria-label="すべてのデータをリセット"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>すべてのデータをリセット</h2>
            <p className="settings-note">
              この操作は取り消せません。実行するには確認のため「リセット」と入力してください。
            </p>
            <Field label="確認入力" htmlFor="settings-reset-confirm">
              <TextInput
                id="settings-reset-confirm"
                value={resetConfirmText}
                onChange={(event) => setResetConfirmText(event.target.value)}
                placeholder="リセット"
                autoComplete="off"
              />
            </Field>
            <div className="btn-row">
              <Button
                variant="danger"
                onClick={handleReset}
                disabled={resetConfirmText !== 'リセット'}
              >
                リセットする
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setResetOpen(false);
                  setResetConfirmText('');
                }}
              >
                キャンセル
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
