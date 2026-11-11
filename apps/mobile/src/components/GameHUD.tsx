import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MATERIAL_NAMES,
  formatElapsed,
  remainingRestSeconds,
  sessionElapsedSeconds,
} from '@tasmate/core';
import { useNow } from '../hooks/useNow';
import { useMobileAppStore } from '../stores/appStore';
import {
  attributePalette,
  colors,
  fontSize,
  radius,
  shadows,
  spacing,
  withAlpha,
} from '../theme/tokens';

const MATERIAL_META: Record<string, { glyph: string; color: string }> = {
  shard_sun: { glyph: attributePalette.sun.glyph, color: attributePalette.sun.color },
  shard_moon: { glyph: attributePalette.moon.glyph, color: attributePalette.moon.color },
  shard_star: { glyph: attributePalette.star.glyph, color: attributePalette.star.color },
};

export function GameHUD() {
  const inventory = useMobileAppStore((s) => s.inventory);
  const itemInventory = useMobileAppStore((s) => s.itemInventory);
  const activeSession = useMobileAppStore((s) => s.activeSession);
  const restSession = useMobileAppStore((s) => s.restSession);
  const tasks = useMobileAppStore((s) => s.tasks);

  const isWorking = activeSession !== null;
  const isResting = restSession?.state === 'active';
  const now = useNow(1000, (isWorking && activeSession.state === 'running') || isResting);
  const elapsed = sessionElapsedSeconds(activeSession, now);
  const restRemaining = restSession !== null ? remainingRestSeconds(restSession, now) : 0;
  const activeTaskTitle = tasks.find((t) => t.id === activeSession?.taskId)?.title;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.bar}>
        <View style={styles.mainRow}>
          <View style={styles.brand}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.brandMark}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
            <View>
              <Text style={styles.brandWord}>Tasmate</Text>
              <Text style={styles.brandSub}>STUDY QUEST</Text>
            </View>
          </View>
        </View>

        <View style={styles.resources}>
          <ResourceChip
            glyph="◈"
            value={inventory.currency}
            color={colors.gold}
            label="通貨"
            highlight
          />
          <ResourceChip
            glyph="✦"
            value={itemInventory['stardust'] ?? 0}
            color={colors.accent}
            label="星屑"
          />
          <ResourceChip
            glyph={MATERIAL_META.shard_sun.glyph}
            value={inventory.materials.shard_sun}
            color={MATERIAL_META.shard_sun.color}
            label={MATERIAL_NAMES.shard_sun ?? '太陽のかけら'}
          />
          <ResourceChip
            glyph={MATERIAL_META.shard_moon.glyph}
            value={inventory.materials.shard_moon}
            color={MATERIAL_META.shard_moon.color}
            label={MATERIAL_NAMES.shard_moon ?? '月のかけら'}
          />
          <ResourceChip
            glyph={MATERIAL_META.shard_star.glyph}
            value={inventory.materials.shard_star}
            color={MATERIAL_META.shard_star.color}
            label={MATERIAL_NAMES.shard_star ?? '星のかけら'}
          />
        </View>

        {(isWorking || isResting) && (
          <View style={styles.sessionRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isWorking
                    ? activeSession.state === 'paused'
                      ? colors.warning
                      : colors.success
                    : colors.accent,
                },
              ]}
            />
            <Text style={styles.sessionLabel}>
              {isWorking
                ? activeSession.state === 'paused'
                  ? '一時停止中'
                  : '作業中'
                : '休憩中'}
            </Text>
            <Text style={styles.sessionValue}>
              {formatElapsed(isWorking ? elapsed : restRemaining)}
            </Text>
            {activeTaskTitle !== undefined && isWorking && (
              <Text style={styles.activeTask} numberOfLines={1}>
                {activeTaskTitle}
              </Text>
            )}
          </View>
        )}
        <View pointerEvents="none" style={styles.edgeShine} />
      </View>
    </SafeAreaView>
  );
}

function ResourceChip({
  glyph,
  value,
  color,
  label,
  highlight = false,
}: {
  glyph: string;
  value: number;
  color: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <View
      style={[
        styles.resource,
        highlight ? styles.resourceHighlight : null,
        highlight ? { borderColor: withAlpha(colors.gold, 0.55) } : null,
      ]}
      accessibilityLabel={`${label} ${value}`}
    >
      <View style={[styles.resourceGlyphBox, { backgroundColor: withAlpha(color, 0.14) }]}>
        <Text style={[styles.resourceGlyph, { color }]}>{glyph}</Text>
      </View>
      <Text style={styles.resourceValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
  },
  bar: {
    backgroundColor: colors.surfaceGlassStrong,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: 5,
    paddingBottom: 7,
    gap: 5,
    ...shadows.card,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 38,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 0,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  brandWord: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  brandSub: {
    color: colors.primary,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  resources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  resource: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 3,
    paddingRight: 7,
    paddingVertical: 2,
  },
  resourceHighlight: {
    backgroundColor: colors.goldSoft,
  },
  resourceGlyphBox: {
    width: 16,
    height: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceGlyph: {
    fontSize: 9,
    fontWeight: '900',
  },
  resourceValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryPale,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sessionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  sessionValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  activeTask: {
    flexShrink: 1,
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
  },
  edgeShine: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    height: 1,
    backgroundColor: colors.highlight,
  },
});
