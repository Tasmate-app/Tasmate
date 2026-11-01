import { StyleSheet, Text, View } from 'react-native';
import { formatElapsed, remainingRestSeconds } from '@tasmate/core';
import { useNow } from '../../hooks/useNow';
import { useMobileAppStore } from '../../stores/appStore';
import { GameButton, Panel, ProgressBar } from '../../ui';
import { colors, fontSize, spacing } from '../../theme/tokens';

export function ActiveRestPanel() {
  const restSession = useMobileAppStore((s) => s.restSession);
  const skipRest = useMobileAppStore((s) => s.skipRest);
  const active = restSession?.state === 'active';
  const now = useNow(1000, active);

  if (restSession === null || restSession.state !== 'active') return null;

  const total = Math.max(1, restSession.plannedMinutes * 60);
  const remaining = remainingRestSeconds(restSession, now);
  const progress = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));

  return (
    <Panel title="休憩中" eyebrow="BREAK TIME" accentColor={colors.accent}>
      <View style={styles.body}>
        <Text style={styles.timer}>{formatElapsed(remaining)}</Text>
        <ProgressBar value={progress} color={colors.accent} height={9} />
        <Text style={styles.note}>
          設定した時間になると自動で完了します。早めに終えることもできます。
        </Text>
        <GameButton label="休憩を終える" variant="secondary" onPress={skipRest} />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  timer: {
    color: colors.accent,
    fontSize: 44,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
    textAlign: 'center',
  },
});
