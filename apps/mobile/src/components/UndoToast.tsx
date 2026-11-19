import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PendingDeletion } from '@tasmate/core';
import { useMobileAppStore } from '../stores/appStore';
import { colors, fontSize, radius, shadows, spacing } from '../theme/tokens';

const UNDO_VISIBLE_MS = 6000;

const KIND_LABELS: Record<PendingDeletion['kind'], string> = {
  task: 'クエスト',
  category: 'カテゴリー',
  subCategory: 'サブカテゴリー',
  recurrenceRule: '繰り返し',
  session: '作業セッション',
};

/** 削除直後に「元に戻す」操作を提示する */
export function UndoToast() {
  const insets = useSafeAreaInsets();
  const lastDeletion = useMobileAppStore((s) => s.lastDeletion);
  const undoLastDeletion = useMobileAppStore((s) => s.undoLastDeletion);
  const dismissLastDeletion = useMobileAppStore((s) => s.dismissLastDeletion);
  const hasSupportEvent = useMobileAppStore((s) =>
    s.supportEvents.some((event) => !event.seen),
  );

  useEffect(() => {
    if (lastDeletion === null) return;
    const remaining = Math.max(
      0,
      Date.parse(lastDeletion.deletedAt) + UNDO_VISIBLE_MS - Date.now(),
    );
    const timer = setTimeout(dismissLastDeletion, remaining);
    return () => clearTimeout(timer);
  }, [lastDeletion, dismissLastDeletion]);

  if (lastDeletion === null) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.layer,
        { bottom: insets.bottom + 92 + (hasSupportEvent ? 84 : 0) },
      ]}
    >
      <View
        style={styles.toast}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel="削除の取り消し"
      >
        <Text style={styles.message}>
          {KIND_LABELS[lastDeletion.kind]}「{lastDeletion.label}」を削除しました
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="削除を元に戻す"
          onPress={undoLastDeletion}
          style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
        >
          <Text style={styles.actionText}>元に戻す</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="削除の通知を閉じる"
          onPress={dismissLastDeletion}
          style={({ pressed }) => [styles.close, pressed ? styles.pressed : null]}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 60,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceGlassStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    ...shadows.floating,
  },
  message: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  action: {
    flexShrink: 0,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  actionText: {
    color: colors.primaryDark,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  closeText: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
});
