import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  EmptyState,
  GameButton,
  Panel,
  ProgressBar,
  QuestCard,
  ScreenBackground,
  ScreenHeader,
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

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [ruleEditor, setRuleEditor] = useState<{ rule?: RecurrenceRule } | null>(null);
  const [setupTaskId, setSetupTaskId] = useState<string | null>(null);
  const [lastRewardId, setLastRewardId] = useState<string | null>(null);
  const [showPlanner, setShowPlanner] = useState(false);

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
  const completionRate =
    weekSummary.completionRate === null
      ? '--'
      : `${Math.round(weekSummary.completionRate * 100)}%`;

  const openNewTask = (date?: string) => setEditor({ date });
  const openEditTask = (task: Task) => setEditor({ task });

  return (
    <>
      <ScreenBackground>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            eyebrow="SORTIE / DAILY QUEST"
            title="出撃"
            subtitle="クエストを選んで、集中した時間を報酬と成長につなげよう。"
            right={
              <View style={styles.streakPill}>
                <Text style={styles.streakLabel}>STREAK</Text>
                <Text style={styles.streakValue}>
                  {weeklyProgress.currentStreak}
                  <Text style={styles.streakUnit}>週</Text>
                </Text>
              </View>
            }
          />

          <View style={styles.commandCard}>
            <View pointerEvents="none" style={styles.commandSheen} />
            <View style={styles.commandTop}>
              <View style={styles.commandTitleWrap}>
                <Text style={styles.commandEyebrow}>TODAY&apos;S OPERATION</Text>
                <Text style={styles.commandTitle}>今日の作戦</Text>
              </View>
              <View style={styles.commandRate}>
                <Text style={styles.commandRateLabel}>今週の達成率</Text>
                <Text style={styles.commandRateValue}>{completionRate}</Text>
              </View>
            </View>

            <View style={styles.commandStats}>
              <CommandStat
                glyph="◈"
                label="今日の予定"
                value={todayTasks.length}
                suffix="件"
                color={colors.primary}
              />
              <CommandStat
                glyph="✓"
                label="完了"
                value={completedToday}
                suffix="件"
                color={colors.success}
              />
              <CommandStat
                glyph="✦"
                label="連続"
                value={weeklyProgress.currentStreak}
                suffix="週"
                color={colors.gold}
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
                height={9}
              />
            </View>

            <View style={styles.commandActions}>
              <GameButton
                label="＋ クエストを追加"
                onPress={() => openNewTask()}
                style={styles.commandAction}
              />
              <GameButton
                label={showPlanner ? '週間計画を閉じる' : '週間計画を見る'}
                variant="secondary"
                onPress={() => setShowPlanner((value) => !value)}
                style={styles.commandAction}
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
                  <GameButton
                    label="＋ 追加"
                    size="sm"
                    variant="ghost"
                    onPress={() => openNewTask(todayKey)}
                  />
                }
              >
                <View style={styles.boardHead}>
                  <Text style={styles.boardLead}>
                    未完了のクエストを選んで出撃準備へ。集中した時間が報酬になります。
                  </Text>
                  <View style={styles.boardCount}>
                    <Text style={styles.boardCountValue}>{plannedTasks.length}</Text>
                    <Text style={styles.boardCountUnit}>件</Text>
                  </View>
                </View>
                {plannedTasks.length === 0 ? (
                  <EmptyState message="開始できるクエストがありません。新しいクエストを作成してください。" />
                ) : (
                  <View style={styles.questList}>
                    {plannedTasks.map((task) => {
                      const dateKey = taskScheduledDateKey(task);
                      const isToday = dateKey === todayKey;
                      const overdue = dateKey !== undefined && dateKey < todayKey;
                      return (
                        <QuestCard
                          key={task.id}
                          title={task.title}
                          category={task.category}
                          categoryColor={categoryColor(task.category)}
                          schedule={taskScheduleLabel(task)}
                          time={taskTimeLabel(task)}
                          estimatedMinutes={task.estimatedMinutes}
                          description={task.description}
                          badges={[
                            ...(isToday ? [{ label: '今日', tone: 'primary' as const }] : []),
                            ...(overdue
                              ? [{ label: '期限超過', tone: 'warning' as const }]
                              : []),
                          ]}
                          onPress={() => openEditTask(task)}
                          onStart={() => setSetupTaskId(task.id)}
                        />
                      );
                    })}
                  </View>
                )}
              </Panel>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showPlanner }}
                accessibilityLabel="週間計画を開く"
                onPress={() => setShowPlanner((value) => !value)}
                style={({ pressed }) => [
                  styles.plannerToggle,
                  showPlanner ? styles.plannerToggleOpen : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.plannerIcon}>
                  <Text style={styles.plannerIconText}>▦</Text>
                </View>
                <View style={styles.plannerBody}>
                  <Text style={styles.plannerTitle}>週間計画</Text>
                  <Text style={styles.plannerSub}>
                    {showPlanner
                      ? 'タップして閉じる'
                      : '1週間の予定・継続状況・繰り返し予定を確認'}
                  </Text>
                </View>
                <Text style={styles.plannerChevron}>{showPlanner ? '▲' : '▼'}</Text>
              </Pressable>
            </>
          )}

          {showPlanner && (
            <WeeklyPlannerSection
              onEditTask={openEditTask}
              onCreateTask={(date) => openNewTask(date)}
              onCreateRule={() => setRuleEditor({})}
              onEditRule={(rule) => setRuleEditor({ rule })}
            />
          )}
        </ScrollView>
      </ScreenBackground>

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

function CommandStat({
  glyph,
  label,
  value,
  suffix,
  color,
}: {
  glyph: string;
  label: string;
  value: number;
  suffix: string;
  color: string;
}) {
  return (
    <View style={styles.commandStat}>
      <View style={[styles.commandStatIcon, { backgroundColor: `${color}18` }]}>
        <Text style={[styles.commandStatGlyph, { color }]}>{glyph}</Text>
      </View>
      <View>
        <Text style={styles.commandStatLabel}>{label}</Text>
        <Text style={styles.commandStatValue}>
          {value}
          <Text style={styles.commandStatSuffix}>{suffix}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  streakPill: {
    alignItems: 'center',
    backgroundColor: colors.goldSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#f0d18c',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  streakLabel: {
    color: '#a86a00',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  streakValue: {
    color: '#8a5600',
    fontSize: fontSize.xl,
    fontWeight: '900',
    lineHeight: 22,
  },
  streakUnit: {
    fontSize: 10,
    fontWeight: '800',
  },
  commandCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  commandSheen: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -80,
    top: -110,
    backgroundColor: colors.primaryPale,
  },
  commandTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  commandTitleWrap: {
    flex: 1,
  },
  commandEyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  commandTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
  commandRate: {
    alignItems: 'flex-end',
  },
  commandRateLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  commandRateValue: {
    color: colors.primaryDark,
    fontSize: fontSize.xxl,
    fontWeight: '900',
    lineHeight: 30,
  },
  commandStats: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  commandStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  commandStatIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commandStatGlyph: {
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  commandStatLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  commandStatValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '900',
    lineHeight: 19,
  },
  commandStatSuffix: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
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
  commandActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commandAction: {
    flex: 1,
  },
  boardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  boardLead: {
    flex: 1,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  boardCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.primaryPale,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  boardCountValue: {
    color: colors.primaryDark,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  boardCountUnit: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  questList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  plannerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.soft,
  },
  plannerToggleOpen: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryPale,
  },
  plannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  plannerIconText: {
    color: colors.primaryDark,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  plannerBody: {
    flex: 1,
    gap: 1,
  },
  plannerTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  plannerSub: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  plannerChevron: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.8,
  },
});
