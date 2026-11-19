import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { NOTIFICATION_RULES, isValidTime } from '@tasmate/core';
import { useMobileAppStore } from '../../stores/appStore';
import {
  FormField,
  GameButton,
  GameTextInput,
  Panel,
} from '../../ui';
import {
  getExactAlarmPermissionState,
  getNotificationPermissionInfo,
  openNotificationSettings,
  requestExactAlarmPermission,
  requestNotificationPermission,
  type ExactAlarmPermissionState,
  type NotificationPermissionInfo,
  type NotificationPermissionState,
} from '../../services/taskNotifications';
import { colors, fontSize, radius, spacing } from '../../theme/tokens';

const PERMISSION_LABELS: Record<NotificationPermissionState, string> = {
  granted: '許可済み',
  denied: '拒否',
  undetermined: '未設定',
};

function exactAlarmLabel(state: ExactAlarmPermissionState): string {
  switch (state) {
    case 'granted':
      return '許可済み';
    case 'denied':
      return '未許可';
    case 'undetermined':
      return '未設定';
    case 'unsupported':
      return '対象外';
  }
}

export function NotificationSettingsPanel() {
  const notifications = useMobileAppStore((s) => s.settings.notifications);
  const updateNotificationSettings = useMobileAppStore(
    (s) => s.updateNotificationSettings,
  );

  const [permission, setPermission] = useState<NotificationPermissionInfo | null>(
    null,
  );
  const [exactAlarm, setExactAlarm] =
    useState<ExactAlarmPermissionState>('unsupported');
  const [startTimeText, setStartTimeText] = useState(notifications.defaultStartTime);
  const [delayText, setDelayText] = useState(
    String(notifications.incompleteDelayMinutes),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refreshPermissions = useCallback(async () => {
    const [nextPermission, nextExactAlarm] = await Promise.all([
      getNotificationPermissionInfo().catch(() => null),
      getExactAlarmPermissionState().catch(
        () => 'unsupported' as ExactAlarmPermissionState,
      ),
    ]);
    setPermission(nextPermission);
    setExactAlarm(nextExactAlarm);
  }, []);

  useEffect(() => {
    void refreshPermissions();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void refreshPermissions();
    });
    return () => subscription.remove();
  }, [refreshPermissions]);

  useEffect(() => {
    setStartTimeText(notifications.defaultStartTime);
  }, [notifications.defaultStartTime]);

  useEffect(() => {
    setDelayText(String(notifications.incompleteDelayMinutes));
  }, [notifications.incompleteDelayMinutes]);

  const handleMasterChange = async (enabled: boolean) => {
    if (enabled === notifications.enabled) return;
    updateNotificationSettings({ enabled });
    setError('');
    if (!enabled) return;

    setBusy(true);
    try {
      const current = await getNotificationPermissionInfo();
      if (current.status !== 'granted' && current.canAskAgain) {
        await requestNotificationPermission();
      }
      await refreshPermissions();
    } catch {
      setError('通知の許可状態を確認できませんでした。端末の設定を確認してください。');
    } finally {
      setBusy(false);
    }
  };

  const handlePermissionAction = async () => {
    setError('');
    setBusy(true);
    try {
      if (
        permission !== null &&
        permission.status !== 'granted' &&
        permission.canAskAgain
      ) {
        await requestNotificationPermission();
      } else {
        await openNotificationSettings();
      }
      await refreshPermissions();
    } catch {
      setError('通知の許可状態を確認できませんでした。端末の設定を確認してください。');
    } finally {
      setBusy(false);
    }
  };

  const handleExactAlarmAction = async () => {
    setError('');
    setBusy(true);
    try {
      await requestExactAlarmPermission();
      setExactAlarm(await getExactAlarmPermissionState());
    } catch {
      setError('正確なアラームの設定を確認できませんでした。端末の設定を確認してください。');
    } finally {
      setBusy(false);
    }
  };

  const changeStartTime = (value: string) => {
    setStartTimeText(value);
    const trimmed = value.trim();
    if (isValidTime(trimmed) && trimmed !== notifications.defaultStartTime) {
      updateNotificationSettings({ defaultStartTime: trimmed });
    }
  };

  const commitStartTime = () => {
    const value = startTimeText.trim();
    if (!isValidTime(value)) {
      setStartTimeText(notifications.defaultStartTime);
      setError('既定時刻は HH:mm 形式（例: 09:00）で入力してください。');
      return;
    }
    setError('');
    if (value !== notifications.defaultStartTime) {
      updateNotificationSettings({ defaultStartTime: value });
    }
  };

  const changeDelay = (value: string) => {
    setDelayText(value);
    const parsed = Number(value);
    if (
      value.trim() !== '' &&
      Number.isInteger(parsed) &&
      parsed >= NOTIFICATION_RULES.minDelayMinutes &&
      parsed <= NOTIFICATION_RULES.maxDelayMinutes &&
      parsed !== notifications.incompleteDelayMinutes
    ) {
      updateNotificationSettings({ incompleteDelayMinutes: parsed });
    }
  };

  const commitDelay = () => {
    const parsed = Number(delayText);
    if (delayText.trim() === '' || !Number.isFinite(parsed)) {
      setDelayText(String(notifications.incompleteDelayMinutes));
      setError(
        `猶予は${NOTIFICATION_RULES.minDelayMinutes}〜${NOTIFICATION_RULES.maxDelayMinutes}分で入力してください。`,
      );
      return;
    }
    const value = Math.min(
      NOTIFICATION_RULES.maxDelayMinutes,
      Math.max(NOTIFICATION_RULES.minDelayMinutes, Math.floor(parsed)),
    );
    setDelayText(String(value));
    setError('');
    if (value !== notifications.incompleteDelayMinutes) {
      updateNotificationSettings({ incompleteDelayMinutes: value });
    }
  };

  const permissionLabel =
    permission === null ? '確認中' : PERMISSION_LABELS[permission.status];
  const needsPermission =
    notifications.enabled &&
    permission !== null &&
    permission.status !== 'granted';
  const needsExactAlarm =
    Platform.OS === 'android' &&
    exactAlarm !== 'granted' &&
    exactAlarm !== 'unsupported';
  const permissionActionLabel =
    permission !== null &&
    permission.status !== 'granted' &&
    permission.canAskAgain
      ? '通知を許可する'
      : '端末の設定を開く';

  return (
    <Panel
      title="通知"
      eyebrow="REMINDERS"
      subtitle="予定したクエストの開始時刻と、未完了のまま過ぎたことを端末に通知します。"
      tone="secondary"
    >
      <SettingToggleRow
        label="通知を有効にする"
        description="アプリを閉じていても、予定時刻に通知が届きます。"
        value={notifications.enabled}
        onValueChange={(next) => {
          void handleMasterChange(next);
        }}
      />

      <View style={styles.statusRow}>
        <View style={styles.textWrap}>
          <Text style={styles.rowLabel}>端末の通知権限</Text>
          <Text style={styles.rowDescription}>OSの設定で通知を許可する必要があります。</Text>
        </View>
        <Text
          style={[
            styles.statusValue,
            permission?.status === 'granted' ? styles.statusOk : styles.statusNg,
          ]}
        >
          {permissionLabel}
        </Text>
      </View>

      {needsPermission && (
        <View style={styles.warning} accessibilityRole="alert">
          <Text style={styles.warningText}>
            {permission?.status === 'denied'
              ? '通知が許可されていません。下のボタンから端末の設定を確認してください。'
              : '通知の許可が必要です。下のボタンから許可してください。'}
          </Text>
        </View>
      )}

      <GameButton
        label={permissionActionLabel}
        variant="secondary"
        size="sm"
        onPress={() => {
          void handlePermissionAction();
        }}
        disabled={busy || permission === null}
      />

      <View style={styles.divider} />

      <SettingToggleRow
        label="開始時刻の通知"
        description="予定した開始時刻になったら知らせます。"
        value={notifications.taskStartEnabled}
        onValueChange={(value) =>
          updateNotificationSettings({ taskStartEnabled: value })
        }
      />

      <FormField
        label="開始時刻がない予定の既定時刻"
        hint="HH:mm 形式（例: 09:00）。時刻を指定していない予定に使います。"
      >
        <GameTextInput
          value={startTimeText}
          onChangeText={changeStartTime}
          onBlur={commitStartTime}
          onSubmitEditing={commitStartTime}
          placeholder="09:00"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          returnKeyType="done"
          accessibilityLabel="開始時刻がない予定の既定時刻"
        />
      </FormField>

      <SettingToggleRow
        label="未完了リマインダー"
        description="開始時刻を過ぎても未完了なら知らせます。中断中のクエストも対象です。"
        value={notifications.incompleteReminderEnabled}
        onValueChange={(value) =>
          updateNotificationSettings({ incompleteReminderEnabled: value })
        }
      />

      <FormField
        label="未完了通知の猶予"
        hint={`開始時刻から何分後に通知するか（${NOTIFICATION_RULES.minDelayMinutes}〜${NOTIFICATION_RULES.maxDelayMinutes}分）。`}
      >
        <GameTextInput
          value={delayText}
          onChangeText={changeDelay}
          onBlur={commitDelay}
          onSubmitEditing={commitDelay}
          placeholder="10"
          keyboardType="number-pad"
          maxLength={4}
          returnKeyType="done"
          accessibilityLabel="未完了通知の猶予（分）"
        />
      </FormField>

      {Platform.OS === 'android' && (
        <>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <View style={styles.textWrap}>
              <Text style={styles.rowLabel}>正確なアラーム</Text>
              <Text style={styles.rowDescription}>
                許可すると予定時刻どおりに通知しやすくなります。
              </Text>
            </View>
            <Text
              style={[
                styles.statusValue,
                exactAlarm === 'granted' ? styles.statusOk : styles.statusNg,
              ]}
            >
              {exactAlarmLabel(exactAlarm)}
            </Text>
          </View>
          {needsExactAlarm && (
            <>
              <GameButton
                label="正確なアラームを許可"
                variant="secondary"
                size="sm"
                onPress={() => {
                  void handleExactAlarmAction();
                }}
                disabled={busy}
              />
              <Text style={styles.note}>
                未許可でも通知は届きますが、端末の省電力設定により時刻が前後する場合があります。
              </Text>
            </>
          )}
        </>
      )}

      <View style={styles.divider} />

      <Text style={styles.note}>
        通知は端末内で生成され、外部へ送信されません。クエストを完了・削除すると、対応する通知も解除されます。
      </Text>

      {error !== '' && (
        <View style={styles.error} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </Panel>
  );
}

function SettingToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.textWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        onPress={() => onValueChange(!value)}
        style={({ pressed }) => [
          styles.toggle,
          value ? styles.toggleOn : styles.toggleOff,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text
          style={[
            styles.toggleText,
            value ? styles.toggleTextOn : styles.toggleTextOff,
          ]}
        >
          {value ? 'ON' : 'OFF'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  rowDescription: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  statusValue: {
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  statusOk: {
    color: colors.success,
  },
  statusNg: {
    color: colors.danger,
  },
  toggle: {
    minWidth: 52,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
  },
  toggleOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong,
  },
  toggleOff: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '900',
  },
  toggleTextOn: {
    color: colors.primaryDark,
  },
  toggleTextOff: {
    color: colors.textSubtle,
  },
  pressed: {
    opacity: 0.72,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  warning: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#f5b5c4',
    backgroundColor: colors.dangerSoft,
    padding: spacing.sm,
  },
  warningText: {
    color: colors.danger,
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
  note: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
});
