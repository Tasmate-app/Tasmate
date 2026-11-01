import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHARACTER_DEFINITIONS } from '@tasmate/core';
import { useMobileAppStore } from '../stores/appStore';
import { attributeColor, colors, fontSize, radius, shadows, spacing } from '../theme/tokens';

const KIND_LABELS: Record<string, string> = {
  'consecutive-work': '連続作業のおうえん',
  'long-work': '長時間作業のおうえん',
  'rest-complete': '休憩完了',
};

export function SupportToast() {
  const insets = useSafeAreaInsets();
  const supportEvents = useMobileAppStore((s) => s.supportEvents);
  const acknowledgeSupportEvent = useMobileAppStore((s) => s.acknowledgeSupportEvent);
  const event = supportEvents.find((item) => !item.seen);

  if (event === undefined) return null;

  const character =
    CHARACTER_DEFINITIONS.find((definition) => definition.id === event.characterId) ??
    CHARACTER_DEFINITIONS[0];
  const palette = attributeColor(character.attribute);

  return (
    <View pointerEvents="box-none" style={[styles.layer, { bottom: insets.bottom + 92 }]}>
      <View style={styles.toast} accessibilityRole="alert">
        <View style={[styles.avatar, { backgroundColor: `${palette}25`, borderColor: palette }]}>
          <Text style={[styles.avatarText, { color: palette }]}>{character.name.slice(0, 1)}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>
            {character.name} / {KIND_LABELS[event.kind] ?? 'お知らせ'}
          </Text>
          <Text style={styles.message}>{event.message}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="応援メッセージを閉じる"
          onPress={() => acknowledgeSupportEvent(event.id)}
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
    zIndex: 50,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    ...shadows.floating,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.primaryDark,
    fontSize: fontSize.xs,
    fontWeight: '900',
  },
  message: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  pressed: {
    opacity: 0.7,
  },
  closeText: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '800',
  },
});
