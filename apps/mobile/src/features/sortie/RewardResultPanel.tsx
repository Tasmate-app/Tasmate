import { StyleSheet, Text, View } from 'react-native';
import {
  MATERIAL_NAMES,
  REST_PRESET_MINUTES,
  formatElapsed,
  recommendedRestMinutes,
  remainingRestSeconds,
  sessionElapsedSeconds,
} from '@tasmate/core';
import { useMobileAppStore } from '../../stores/appStore';
import { useNow } from '../../hooks/useNow';
import { Badge, GameButton, Panel, ProgressBar } from '../../ui';
import { colors, fontSize, radius, spacing } from '../../theme/tokens';

interface RewardResultPanelProps {
  rewardId: string;
  onClose: () => void;
}

export function RewardResultPanel({ rewardId, onClose }: RewardResultPanelProps) {
  const rewards = useMobileAppStore((s) => s.rewards);
  const sessionHistory = useMobileAppStore((s) => s.sessionHistory);
  const reward = rewards.find((item) => item.id === rewardId);

  if (reward === undefined) return null;

  const session = sessionHistory.find((item) => item.id === reward.workSessionId);
  const endedAtMs =
    session?.endedAt !== undefined ? Date.parse(session.endedAt) : Date.now();
  const workMinutes =
    session !== undefined ? sessionElapsedSeconds(session, endedAtMs) / 60 : 0;
  const recommendedMinutes = recommendedRestMinutes(workMinutes);

  return (
    <Panel title="クエスト完了" eyebrow="QUEST RESULT" accentColor={colors.success}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>報酬を獲得しました</Text>
        <View style={styles.rewardRow}>
          <RewardChip label="通貨" value={`+${reward.finalReward.currency}`} color="#f59e0b" />
          <RewardChip
            label="経験値"
            value={`+${reward.finalReward.experience}`}
            color={colors.success}
          />
          {Object.entries(reward.finalReward.materials).map(([id, amount]) => (
            <RewardChip
              key={id}
              label={MATERIAL_NAMES[id] ?? id}
              value={`+${amount ?? 0}`}
              color={colors.primary}
            />
          ))}
        </View>
        <Text style={styles.meta}>{reward.inputSummary}</Text>
        {reward.rewardMultiplier !== undefined && reward.rewardMultiplier !== 1 && (
          <Text style={styles.multiplier}>
            週間継続倍率 ×{reward.rewardMultiplier.toFixed(2)} 適用
          </Text>
        )}
      </View>

      <RestSection
        workMinutes={workMinutes}
        recommendedMinutes={recommendedMinutes}
        sourceSessionId={reward.workSessionId}
      />

      <GameButton label="クエスト一覧に戻る" variant="secondary" onPress={onClose} />
    </Panel>
  );
}

function RestSection({
  workMinutes,
  recommendedMinutes,
  sourceSessionId,
}: {
  workMinutes: number;
  recommendedMinutes: number;
  sourceSessionId: string;
}) {
  const storedRestSession = useMobileAppStore((s) => s.restSession);
  const startRest = useMobileAppStore((s) => s.startRest);
  const skipRest = useMobileAppStore((s) => s.skipRest);
  const restSession =
    storedRestSession?.sourceSessionId === sourceSessionId ? storedRestSession : null;
  const active = restSession?.state === 'active';
  const now = useNow(1000, active);
  const remaining = restSession !== null ? remainingRestSeconds(restSession, now) : 0;

  if (active && restSession !== null) {
    const total = Math.max(1, restSession.plannedMinutes * 60);
    const progress = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
    return (
      <View style={styles.restBox}>
        <View style={styles.restHead}>
          <Text style={styles.restTitle}>休憩中</Text>
          <Badge label={`${restSession.plannedMinutes}分`} tone="primary" />
        </View>
        <Text style={styles.restTimer}>{formatElapsed(remaining)}</Text>
        <ProgressBar value={progress} color={colors.accent} height={9} />
        <Text style={styles.meta}>時間になると自動で休憩完了になります。</Text>
        <GameButton label="休憩を終える" variant="secondary" onPress={skipRest} />
      </View>
    );
  }

  if (restSession?.state === 'completed') {
    return (
      <View style={styles.restBox}>
        <Text style={styles.restTitle}>休憩完了</Text>
        <Text style={styles.meta}>おつかれさまでした。次のクエストもマイペースに進めましょう。</Text>
      </View>
    );
  }

  return (
    <View style={styles.restBox}>
      <Text style={styles.restTitle}>休憩しましょう</Text>
      <Text style={styles.meta}>
        作業 {Math.round(workMinutes)}分 に対して、{recommendedMinutes}分の休憩がおすすめです。
      </Text>
      <View style={styles.presets}>
        {REST_PRESET_MINUTES.map((minutes) => (
          <GameButton
            key={minutes}
            label={`${minutes}分`}
            size="sm"
            variant={minutes === recommendedMinutes ? 'primary' : 'ghost'}
            onPress={() => startRest(minutes, sourceSessionId)}
            style={styles.preset}
          />
        ))}
      </View>
    </View>
  );
}

function RewardChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.rewardChip}>
      <View style={[styles.rewardDot, { backgroundColor: color }]} />
      <Text style={styles.rewardLabel}>{label}</Text>
      <Text style={styles.rewardValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#a9ecd1',
    padding: spacing.md,
    gap: spacing.sm,
  },
  bannerTitle: {
    color: colors.success,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  rewardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  rewardDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  rewardLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  rewardValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  multiplier: {
    color: colors.primaryDark,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  restBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.sm,
  },
  restHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  restTimer: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  preset: {
    flexGrow: 1,
  },
});
