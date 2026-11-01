import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import type { RecurrenceRule, Task } from '@tasmate/types';
import {
  formatWeekRange,
  summarizeWeek,
  taskScheduledDateKey,
  toDateKey,
  weekStartKey,
} from '@tasmate/core';
import { useMobileAppStore } from '../stores/appStore';
import { ActiveRestPanel } from '../features/sortie/ActiveRestPanel';
import { ActiveSortiePanel } from '../features/sortie/ActiveSortiePanel';
import { RecurrenceEditorModal } from '../features/sortie/RecurrenceEditorModal';
import { RewardResultPanel } from '../features/sortie/RewardResultPanel';
import { SortieSetupModal } from '../features/sortie/SortieSetupModal';
import { TaskEditorModal } from '../features/sortie/TaskEditorModal';
import { WeeklyPlannerSection } from '../features/sortie/WeeklyPlannerSection';
import { useNow } from '../hooks/useNow';
import { categoryColor, taskScheduleLabel, taskTimeLabel } from '../lib/taskMeta';
import {
  Badge,
  EmptyState,
  GameButton,
  Panel,
  ProgressBar,
  StatTile,
} from '../ui';
import { colors, fontSize, radius, shadows, spacing } from '../theme/tokens';

interface EditorState {
  task?: Task;
  date?: string;
}

export function SortieScreen() {
  const tasks = useMobileAppStore((s) => s.tasks);
  const activeSession = useMobileAppStore((s) => s.activeSession);
  const weeklyProgress = useMobileAppStore((s) => s.weeklyProgress);
  const now = useNow(60_000);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [ruleEditor, setRuleEditor] = useState<{ rule?: RecurrenceRule } | null>(null);
  const [setupTaskId, setSetupTaskId] = useState<string | null>(null);
  const [lastRewardId, setLastRewardId] = useState<string | null>(null);

  const todayKey = toDateKey(new Date(now));
  const currentWeekStart = weekStartKey(new Date(now));
  const todayTasks = tasks.filter(
    (task) => task.archivedAt === undefined && taskScheduledDateKey(task) === todayKey,
  );
  const completedToday = todayTasks.filter((task) => task.status === 'completed').length;
  const weekSummary = useMemo(
    () => summarizeWeek(tasks, currentWeekStart),
    [tasks, currentWeekStart],
  );
  const plannedTasks = tasks
    .filter((task) => task.status === 'planned' && task.archivedAt === undefined)
    .sort((a, b) => {
      const dateA = taskScheduledDateKey(a) ?? '9999-99-99';
      const dateB = taskScheduledDateKey(b) ?? '9999-99-99';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99');
    });
  const setupTask = plannedTasks.find((task) => task.id === setupTaskId) ?? null;

  const openNewTask = (date?: string) => setEditor({ date });
  const openEditTask = (task: Task) => setEditor({ task });

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroText}>
              <Text style={styles.eyebrow}>DAILY QUEST</Text>
              <Text style={styles.title}>今日の出撃</Text>
              <Text style={styles.lead}>
                予定をクエストにして、集中した時間を報酬と成長につなげよう。
              </Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelLabel}>継続</Text>
              <Text style={styles.levelValue}>{weeklyProgress.currentStreak}週</Text>
            </View>
          </View>

          <View style={styles.stats}>
            <StatTile label="今日の予定" value={`${todayTasks.length}件`} />
            <StatTile label="今日の完了" value={`${completedToday}件`} tone={colors.success} />
            <StatTile
              label="今週の達成率"
              value={
                weekSummary.completionRate === null
                  ? '--'
                  : `${Math.round(weekSummary.completionRate * 100)}%`
              }
              tone={colors.primaryDark}
            />
          </View>
          <View style={styles.progressWrap}>
            <View style={styles.progressHead}>
              <Text style={styles.progressLabel}>{formatWeekRange(currentWeekStart)}</Text>
              <Text style={styles.progressValue}>
                {weekSummary.completedTaskCount} / {weekSummary.eligibleTaskCount}件
              </Text>
            </View>
            <ProgressBar
              value={Math.min(100, (weekSummary.completionRate ?? 0) * 100)}
              height={10}
            />
          </View>
          <View style={styles.heroActions}>
            <GameButton
              label="クエストを追加"
              onPress={() => openNewTask()}
              style={styles.heroButton}
            />
            <GameButton
              label="週間予定へ"
              variant="secondary"
              onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
              style={styles.heroButton}
            />
          </View>
        </View>

        {activeSession !== null ? (
          <ActiveSortiePanel onFinished={setLastRewardId} />
        ) : (
          <>
            {lastRewardId !== null ? (
              <RewardResultPanel
                rewardId={lastRewardId}
                onClose={() => setLastRewardId(null)}
              />
            ) : (
              <ActiveRestPanel />
            )}

            <Panel
              title="クエストボード"
              eyebrow="QUEST BOARD"
              accentColor={colors.primary}
              right={
                <GameButton label="＋ 追加" size="sm" variant="ghost" onPress={() => openNewTask(todayKey)} />
              }
            >
              <Text style={styles.panelLead}>
                未完了のクエスト {plannedTasks.length}件。クエストを選んで探索に送り出しましょう。
              </Text>
              {plannedTasks.length === 0 ? (
                <EmptyState message="開始できるクエストがありません。新しいクエストを作成してください。" />
              ) : (
                <View style={styles.questList}>
                  {plannedTasks.map((task) => {
                    const dateKey = taskScheduledDateKey(task);
                    const isToday = dateKey === todayKey;
                    const overdue = dateKey !== undefined && dateKey < todayKey;
                    return (
                      <View key={task.id} style={styles.questCard}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => openEditTask(task)}
                          style={({ pressed }) => [styles.questMain, pressed ? styles.pressed : null]}
                        >
                          <View
                            style={[
                              styles.questRail,
                              { backgroundColor: categoryColor(task.category) },
                            ]}
                          />
                          <View style={styles.questBody}>
                            <View style={styles.questTitleRow}>
                              <Text style={styles.questTitle} numberOfLines={2}>
                                {task.title}
                              </Text>
                              {isToday && <Badge label="今日" tone="primary" />}
                              {overdue && <Badge label="期限超過" tone="warning" />}
                            </View>
                            <Text style={styles.questMeta}>
                              {taskScheduleLabel(task)} / {taskTimeLabel(task)} / {task.category}
                              {task.subject !== undefined ? ` / ${task.subject}` : ''}
                            </Text>
                            <Text style={styles.questMeta}>予定 {task.estimatedMinutes}分</Text>
                            {task.description !== '' && (
                              <Text style={styles.questDescription} numberOfLines={2}>
                                {task.description}
                              </Text>
                            )}
                          </View>
                        </Pressable>
                        <View style={styles.questActions}>
                          <GameButton
                            label="編集"
                            size="sm"
                            variant="ghost"
                            onPress={() => openEditTask(task)}
                            style={styles.questAction}
                          />
                          <GameButton
                            label="出撃準備"
                            size="sm"
                            onPress={() => setSetupTaskId(task.id)}
                            style={styles.questAction}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Panel>
          </>
        )}

        <WeeklyPlannerSection
          onEditTask={openEditTask}
          onCreateTask={(date) => openNewTask(date)}
          onCreateRule={() => setRuleEditor({})}
          onEditRule={(rule) => setRuleEditor({ rule })}
        />
      </ScrollView>

      <TaskEditorModal
        open={editor !== null}
        task={editor?.task}
        initialDate={editor?.date}
        onClose={() => setEditor(null)}
      />
      <SortieSetupModal
        open={setupTask !== null}
        task={setupTask}
        onClose={() => setSetupTaskId(null)}
      />
      <RecurrenceEditorModal
        open={ruleEditor !== null}
        rule={ruleEditor?.rule}
        onClose={() => setRuleEditor(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  heroText: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 2,
  },
  lead: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: 4,
  },
  levelBadge: {
    alignItems: 'center',
    backgroundColor: colors.primaryPale,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  levelLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  levelValue: {
    color: colors.primaryDark,
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progressWrap: {
    gap: spacing.xs,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  progressValue: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroButton: {
    flex: 1,
  },
  panelLead: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  questList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  questCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  questMain: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.78,
  },
  questRail: {
    width: 4,
    borderRadius: 4,
  },
  questBody: {
    flex: 1,
    gap: 3,
  },
  questTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  questTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
    flexShrink: 1,
  },
  questMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
  questDescription: {
    color: colors.textSubtle,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
  questActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  questAction: {
    flex: 1,
  },
});
