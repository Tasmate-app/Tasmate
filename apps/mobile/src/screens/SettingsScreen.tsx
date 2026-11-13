import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { backupFileName, serializeBackup } from '@tasmate/core';
import { useMobileAppStore } from '../stores/appStore';
import { pickBackupFile, shareBackupFile } from '../services/backupFile';
import {
  FormField,
  GameButton,
  GameTextInput,
  ModalSheet,
  Panel,
  ScreenBackground,
  ScreenHeader,
} from '../ui';
import { colors, fontSize, radius, spacing } from '../theme/tokens';

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
export function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useMobileAppStore((s) => s.settings);
  const canPersist = useMobileAppStore((s) => s.canPersist);
  const importAppState = useMobileAppStore((s) => s.importAppState);
  const markBackupExported = useMobileAppStore((s) => s.markBackupExported);
  const resetAll = useMobileAppStore((s) => s.resetAll);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const clearFeedback = () => {
    setMessage('');
    setError('');
  };

  const closeReset = () => {
    setResetOpen(false);
    setResetConfirmText('');
  };

  const handleExport = async () => {
    clearFeedback();
    setBusy(true);
    try {
      const now = new Date();
      const fileName = backupFileName(now);
      await shareBackupFile(fileName, serializeBackup(useMobileAppStore.getState(), now));
      markBackupExported(now.toISOString());
      setMessage('バックアップの書き出しを開始しました。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'バックアップの書き出しに失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    clearFeedback();
    setBusy(true);
    try {
      const raw = await pickBackupFile();
      if (raw === null) return;
      const result = importAppState(raw);
      if (!result.ok) {
        setError(`復元できませんでした。${result.error}`);
        return;
      }
      setMessage('バックアップを復元しました。進行中のタイマーと休憩は解除されています。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'バックアップの読み込みに失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    if (resetConfirmText !== 'リセット') return;
    resetAll();
    closeReset();
    setError('');
    setMessage('すべてのデータをリセットしました。');
  };

  const appVersion = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.md + insets.top,
            paddingBottom: spacing.xxl + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          eyebrow="SETTINGS / DATA"
          title="設定"
          subtitle="バックアップとアプリ情報を管理します。データはこの端末内に保存されます。"
          right={
            <GameButton
              label="戻る"
              size="sm"
              variant="secondary"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
          }
        />

        {!canPersist && (
          <View style={styles.warning} accessibilityRole="alert">
            <Text style={styles.warningText}>
              保存データを読み込めなかったため、この起動ではデータを保存できません。復元・リセットは利用できません。
            </Text>
          </View>
        )}

        <Panel title="データ管理" eyebrow="DATA" tone="primary">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>最終バックアップ</Text>
            <Text style={styles.infoValue}>{formatBackupDate(settings.lastBackupAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>保存先</Text>
            <Text style={styles.infoValue}>この端末（AsyncStorage）</Text>
          </View>

          <Text style={styles.note}>
            バックアップには進行中のタイマーと休憩は含まれません。復元すると現在のデータはすべて上書きされます。
          </Text>

          <GameButton
            label="バックアップを書き出す"
            onPress={handleExport}
            disabled={busy}
          />
          <GameButton
            label="バックアップから復元"
            variant="secondary"
            onPress={handleImport}
            disabled={busy || !canPersist}
          />

          <View style={styles.divider} />

          <Text style={styles.dangerTitle}>すべてのデータをリセット</Text>
          <Text style={styles.note}>
            タスク・履歴・キャラクター・施設・設定を含むすべてのデータを初期状態に戻します。元に戻せません。
          </Text>
          <GameButton
            label="リセット"
            variant="danger"
            onPress={() => {
              clearFeedback();
              setResetOpen(true);
            }}
            disabled={busy || !canPersist}
          />

          {message !== '' && (
            <View style={styles.message}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          )}
          {error !== '' && (
            <View style={styles.error} accessibilityRole="alert">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </Panel>

        <Panel title="アプリ情報" eyebrow="ABOUT" tone="accent">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>アプリ名</Text>
            <Text style={styles.infoValue}>Tasmate</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>バージョン</Text>
            <Text style={styles.infoValue}>{appVersion}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>データ保存</Text>
            <Text style={styles.infoValue}>ローカル保存（アカウント同期なし）</Text>
          </View>
          <View style={styles.ossRow}>
            <Text style={styles.infoLabel}>OSSライセンス</Text>
          </View>
          <GameButton
            label="OSSライセンス一覧を見る"
            variant="secondary"
            onPress={() => router.push('/licenses')}
          />
          <Text style={styles.note}>
            使用しているライブラリのライセンスを確認できます。バックアップファイルは外部に送信されません。
          </Text>
        </Panel>
      </ScrollView>

      <ModalSheet
        visible={resetOpen}
        title="すべてのデータをリセット"
        subtitle="この操作は取り消せません。実行するには「リセット」と入力してください。"
        onClose={closeReset}
      >
        <FormField label="確認入力" hint="確認のため「リセット」と入力してください。">
          <GameTextInput
            value={resetConfirmText}
            onChangeText={setResetConfirmText}
            placeholder="リセット"
            accessibilityLabel="リセット確認入力"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </FormField>
        <GameButton
          label="リセットする"
          variant="danger"
          onPress={handleReset}
          disabled={resetConfirmText !== 'リセット'}
        />
        <GameButton label="キャンセル" variant="secondary" onPress={closeReset} />
      </ModalSheet>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  warning: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#f5b5c4',
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
  },
  warningText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '800',
    lineHeight: 19,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderStyle: 'dashed',
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  infoValue: {
    flexShrink: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
    textAlign: 'right',
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderStrong,
    marginVertical: spacing.xs,
  },
  dangerTitle: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  message: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#a9ecd1',
    backgroundColor: colors.successSoft,
    padding: spacing.sm,
  },
  messageText: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: '800',
    lineHeight: 19,
  },
  error: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#f5b5c4',
    backgroundColor: colors.dangerSoft,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '800',
    lineHeight: 19,
  },
  ossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
