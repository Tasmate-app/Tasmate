import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MATERIAL_NAMES,
  formatElapsed,
  remainingRestSeconds,
  sessionElapsedSeconds,
} from '@tasmate/core';
import { useNow } from '../hooks/useNow';
import { useMobileAppStore } from '../stores/appStore';
import { colors, fontSize, radius, shadows, spacing } from '../theme/tokens';

const MATERIAL_COLORS: Record<string, string> = {
  shard_sun: '#f59e0b',
  shard_moon: '#818cf8',
  shard_star: '#f472b6',
};

export function GameHUD() {
  const inventory = useMobileAppStore((s) => s.inventory);
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
        <View style={styles.brandRow}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>T</Text>
            </View>
            <View>
              <Text style={styles.brandWord}>Tasmate</Text>
              <Text style={styles.brandSub}>STUDY QUEST</Text>
            </View>
          </View>
          {isWorking && (
            <View style={[styles.sessionPill, activeSession.state === 'paused' && styles.pausedPill]}>
              <Text style={styles.sessionLabel}>
                {activeSession.state === 'paused' ? '停止中' : '作業中'}
              </Text>
              <Text style={styles.sessionValue}>{formatElapsed(elapsed)}</Text>
            </View>
          )}
          {isResting && (
            <View style={styles.restPill}>
              <Text style={styles.sessionLabel}>休憩中</Text>
              <Text style={styles.sessionValue}>{formatElapsed(restRemaining)}</Text>
            </View>
          )}
        </View>

        {activeTaskTitle !== undefined && isWorking && (
          <Text style={styles.activeTask} numberOfLines={1}>
            {activeTaskTitle}
          </Text>
        )}

        <View style={styles.resources}>
          <ResourcePill label="通貨" value={inventory.currency} color="#fbbf24" />
          <ResourcePill
            label="太陽"
            value={inventory.materials.shard_sun}
            color={MATERIAL_COLORS.shard_sun}
            title={MATERIAL_NAMES.shard_sun}
          />
          <ResourcePill
            label="月"
            value={inventory.materials.shard_moon}
            color={MATERIAL_COLORS.shard_moon}
            title={MATERIAL_NAMES.shard_moon}
          />
          <ResourcePill
            label="星"
            value={inventory.materials.shard_star}
            color={MATERIAL_COLORS.shard_star}
            title={MATERIAL_NAMES.shard_star}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function ResourcePill({
  label,
  value,
  color,
  title,
}: {
  label: string;
  value: number;
  color: string;
  title?: string;
}) {
  return (
    <View style={styles.resource} accessibilityLabel={title ?? label}>
      <View style={[styles.resourceDot, { backgroundColor: color }]} />
      <Text style={styles.resourceLabel}>{label}</Text>
      <Text style={styles.resourceValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
  },
  bar: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  brandMarkText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
  brandWord: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  brandSub: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pausedPill: {
    backgroundColor: colors.warningSoft,
  },
  restPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sessionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  sessionValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  activeTask: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  resources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  resource: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  resourceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  resourceLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  resourceValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
});
