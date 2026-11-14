import { Alert, StyleSheet, Text, View } from 'react-native';
import { formatElapsed } from '@tasmate/core';
import { useMobileAppStore } from '../../stores/appStore';
import { Badge, GameButton, Panel } from '../../ui';
import { colors, fontSize, radius, spacing } from '../../theme/tokens';

/** 中断して保持しているクエストの一覧。再開・破棄を行う */
export function InterruptedQuestPanel() {
  const quests = useMobileAppStore((s) => s.interruptedQuests);
  const tasks = useMobileAppStore((s) => s.tasks);
  const activeSession = useMobileAppStore((s) => s.activeSession);
  const resumeInterruptedQuest = useMobileAppStore((s) => s.resumeInterruptedQuest);
  const discardInterruptedQuest = useMobileAppStore((s) => s.discardInterruptedQuest);

  if (quests.length === 0) return null;

  const confirmDiscard = (id: string, title: string) => {
    Alert.alert(
      '中断中のクエストを破棄',
      `「${title}」を破棄します。これまでの報酬は保持されますが、再開できなくなります。`,
      [
        { text: '戻る', style: 'cancel' },
        {
          text: '破棄する',
          style: 'destructive',
          onPress: () => discardInterruptedQuest(id),
        },
      ],
    );
  };

  return (
    <Panel title="中断中のクエスト" eyebrow="PAUSED QUESTS" tone="primary">
      <View style={styles.list}>
        {quests.map((quest) => {
          const task = tasks.find((item) => item.id === quest.taskId);
          const title = quest.taskTitleSnapshot ?? task?.title ?? '削除されたタスク';
          const stopwatch = quest.timerMode === 'stopwatch';
          const estimatedTotal = (task?.estimatedMinutes ?? 0) * 60;
          const remaining = Math.max(0, estimatedTotal - quest.elapsedSeconds);
          return (
            <View key={quest.id} style={styles.card}>
              <View style={styles.head}>
                <Text style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
                <Badge label="中断中" tone="paused" />
              </View>
              <Text style={styles.meta}>
                作業済み {formatElapsed(quest.elapsedSeconds)}
                {stopwatch
                  ? ' / ストップウォッチ（予定時間なし）'
                  : ` / 残り ${formatElapsed(remaining)}`}
              </Text>
              <View style={styles.actions}>
                <GameButton
                  label="再開"
                  size="sm"
                  disabled={activeSession !== null}
                  onPress={() => resumeInterruptedQuest(quest.id)}
                  style={styles.action}
                />
                <GameButton
                  label="破棄"
                  size="sm"
                  variant="danger"
                  onPress={() => confirmDiscard(quest.id, title)}
                  style={styles.action}
                />
              </View>
            </View>
          );
        })}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  action: {
    flex: 1,
  },
});
