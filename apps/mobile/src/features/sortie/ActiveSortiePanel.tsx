import { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  CHARACTER_DEFINITIONS,
  DESTINATIONS,
  MATERIAL_NAMES,
  formatElapsed,
  sessionElapsedSeconds,
} from '@tasmate/core';
import { useNow } from '../../hooks/useNow';
import { useMobileAppStore } from '../../stores/appStore';
import { Badge, GameButton, Panel, ProgressBar } from '../../ui';
import { colors, fontSize, radius, shadows, spacing, withAlpha } from '../../theme/tokens';

export function ActiveSortiePanel({
  onFinished,
}: {
  onFinished: (rewardId: string | null) => void;
}) {
  const activeSession = useMobileAppStore((s) => s.activeSession);
  const tasks = useMobileAppStore((s) => s.tasks);
  const facilities = useMobileAppStore((s) => s.facilities);
  const pauseSession = useMobileAppStore((s) => s.pauseSession);
  const resumeSession = useMobileAppStore((s) => s.resumeSession);
  const finishSession = useMobileAppStore((s) => s.finishSession);
  const cancelSession = useMobileAppStore((s) => s.cancelSession);

  const now = useNow(500, activeSession?.state === 'running');
  const elapsed = useMemo(
    () => sessionElapsedSeconds(activeSession, now),
    [activeSession, now],
  );

  if (activeSession === null) return null;

  const task = tasks.find((item) => item.id === activeSession.taskId);
  const destination = DESTINATIONS.find((item) => item.id === activeSession.destinationId);
  const totalSeconds = (task?.estimatedMinutes ?? 25) * 60;
  const progress = totalSeconds > 0 ? Math.min(100, (elapsed / totalSeconds) * 100) : 0;
  const runningFacilities = facilities.filter((facility) => facility.enabled).length;
  const dispatched = activeSession.assignedCharacterIds
    .map((id) => CHARACTER_DEFINITIONS.find((definition) => definition.id === id)?.name ?? id)
    .join('、');

  const finish = (result: 'completed' | 'interrupted') => {
    onFinished(finishSession(result));
  };

  const confirmCancel = () => {
    Alert.alert('出撃を取り消す', '作業記録と報酬は保存されません。取り消しますか？', [
      { text: '続ける', style: 'cancel' },
      { text: '取り消す', style: 'destructive', onPress: () => cancelSession() },
    ]);
  };

  return (
    <Panel title="探索中" eyebrow="ACTIVE SORTIE" accentColor={colors.primary}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.taskTitle}>{task?.title ?? '削除されたクエスト'}</Text>
          <Text style={styles.meta}>
            {destination?.name ?? '探索先不明'} / {dispatched}
          </Text>
        </View>
        <Badge
          label={activeSession.state === 'running' ? '作業中' : '一時停止中'}
          tone={activeSession.state === 'running' ? 'running' : 'paused'}
        />
      </View>

      <View style={styles.timerBox}>
        <View pointerEvents="none" style={styles.timerGlow} />
        <View pointerEvents="none" style={styles.timerRing} />
        <Text style={styles.timerLabel}>MISSION TIMER</Text>
        <Text style={styles.timer} accessibilityLiveRegion="polite">
          {formatElapsed(elapsed)}
        </Text>
        <Text style={styles.timerSub}>
          予定 {task?.estimatedMinutes ?? 25}分 ・ {Math.round(progress)}%
        </Text>
        <View style={styles.timerProgress}>
          <ProgressBar value={progress} height={12} />
        </View>
        <View style={styles.timerStats}>
          <View style={styles.timerStat}>
            <Text style={styles.timerStatLabel}>稼働施設</Text>
            <Text style={styles.timerStatValue}>{runningFacilities}件</Text>
          </View>
          <View style={styles.timerDivider} />
          <View style={styles.timerStat}>
            <Text style={styles.timerStatLabel}>探索先</Text>
            <Text style={styles.timerStatValue} numberOfLines={1}>
              {destination?.name ?? '不明'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        {activeSession.state === 'running' ? (
          <GameButton label="一時停止" variant="secondary" onPress={pauseSession} style={styles.action} />
        ) : (
          <GameButton label="再開" onPress={resumeSession} style={styles.action} />
        )}
        <GameButton
          label="完了して終了"
          variant="success"
          onPress={() => finish('completed')}
          style={styles.action}
        />
      </View>
      <View style={styles.actions}>
        <GameButton
          label="中断して終了"
          variant="secondary"
          onPress={() => finish('interrupted')}
          style={styles.action}
        />
        <GameButton
          label="記録せず取消"
          variant="danger"
          onPress={confirmCancel}
          style={styles.action}
        />
      </View>

      {destination !== undefined && (
        <View style={styles.materials}>
          <Text style={styles.materialsTitle}>入手候補</Text>
          <Text style={styles.meta}>
            {Object.entries(destination.availableMaterials)
              .map(([id, ratio]) => `${MATERIAL_NAMES[id] ?? id} ${Math.round((ratio ?? 0) * 100)}%`)
              .join(' / ')}
          </Text>
        </View>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  timerBox: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryPale,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginVertical: spacing.xs,
    overflow: 'hidden',
    ...shadows.soft,
  },
  timerGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -110,
    right: -46,
    backgroundColor: withAlpha(colors.primary, 0.12),
  },
  timerRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -66,
    left: -34,
    borderWidth: 14,
    borderColor: withAlpha(colors.primary, 0.1),
  },
  timerLabel: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  timer: {
    color: colors.text,
    fontSize: 50,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
    lineHeight: 56,
  },
  timerSub: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  timerProgress: {
    width: '100%',
  },
  timerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.xs,
  },
  timerStat: {
    alignItems: 'center',
    gap: 1,
    flexShrink: 1,
  },
  timerDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.border,
  },
  timerStatLabel: {
    color: colors.textSubtle,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  timerStatValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
  materials: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: 2,
  },
  materialsTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
});
