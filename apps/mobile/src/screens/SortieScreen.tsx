import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RecurrenceRule, Task } from '@tasmate/types';
import {
  WEEKDAY_LABELS,
  formatWeekRange,
  getWeekDates,
  summarizeWeek,
  taskScheduledDateKey,
  toDateKey,
  weekStartKey,
  weekdayNumber,
} from '@tasmate/core';
import { useMobileAppStore } from '../stores/appStore';
import { ActiveRestPanel } from '../features/sortie/ActiveRestPanel';
import { ActiveSortiePanel } from '../features/sortie/ActiveSortiePanel';
import { RecurrenceEditorModal } from '../features/sortie/RecurrenceEditorModal';
import { RewardResultPanel } from '../features/sortie/RewardResultPanel';
import { SortieSetupModal } from '../features/sortie/SortieSetupModal';
import { StopwatchStartModal } from '../features/sortie/StopwatchStartModal';
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
  QuestCard,
  ScreenBackground,
  ScreenHeader,
} from '../ui';
import {
  colors,
  fontSize,
  radius,
  shadows,
  spacing,
  withAlpha,
} from '../theme/tokens';

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
  const [stopwatchOpen, setStopwatchOpen] = useState(false);
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
  const nextTask = plannedTasks[0];
  const setupTask = plannedTasks.find((task) => task.id === setupTaskId) ?? null;
  const completionRate =
    weekSummary.completionRate === null
      ? '--'
      : `${Math.round(weekSummary.completionRate * 100)}%`;
  const weekDays = useMemo(
    () =>
      getWeekDates(currentWeekStart).map((day) => {
        const dateKey = toDateKey(day);
        const dayTasks = tasks.filter(
          (task) => task.archivedAt === undefined && taskScheduledDateKey(task) === dateKey,
        );
        return {
          dateKey,
          weekday: WEEKDAY_LABELS[weekdayNumber(day) - 1],
          day: day.getDate(),
          total: dayTasks.length,
          done: dayTasks.filter((task) => task.status === 'completed').length,
          isToday: dateKey === todayKey,
        };
      }),
    [tasks, currentWeekStart, todayKey],
  );

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
            right={<StreakPill streak={weeklyProgress.currentStreak} />}
          />

          <View style={styles.hero}>
            <View pointerEvents="none" style={styles.heroSky} />
            <View pointerEvents="none" style={styles.heroSun} />
            <View pointerEvents="none" style={styles.heroOrb} />
            <View style={styles.heroTop}>
              <View style={styles.heroTitleWrap}>
                <View style={styles.heroEyebrowRow}>
                  <View style={styles.heroEyebrowDot} />
                  <Text style={styles.heroEyebrow}>TODAY&apos;S OPERATION</Text>
                </View>
                <Text style={styles.heroTitle}>今日の作戦</Text>
                <Text style={styles.heroSub}>{formatWeekRange(currentWeekStart)}</Text>
              </View>
              <View style={styles.heroRate}>
                <Text style={styles.heroRateLabel}>今週の達成率</Text>
                <Text style={styles.heroRateValue}>{completionRate}</Text>
                <Text style={styles.heroRateSub}>
                  {weekSummary.completedTaskCount} / {weekSummary.eligibleTaskCount}件
                </Text>
              </View>
            </View>

            <View style={styles.heroProgress}>
              <View style={styles.progressHead}>
                <Text style={styles.progressLabel}>WEEKLY PROGRESS</Text>
                <Text style={styles.progressValue}>
                  {weekSummary.completedTaskCount} / {weekSummary.eligibleTaskCount}
                </Text>
              </View>
              <ProgressBar
                value={Math.min(100, (weekSummary.completionRate ?? 0) * 100)}
                height={12}
                color={colors.primary}
              />
            </View>

            <View style={styles.heroStats}>
              <MissionStat
                glyph="◈"
                label="今日の予定"
                value={`${todayTasks.length}`}
                unit="件"
                color={colors.primary}
              />
              <MissionStat
                glyph="✓"
                label="完了"
                value={`${completedToday}`}
                unit="件"
                color={colors.success}
              />
              <MissionStat
                glyph="✦"
                label="連続"
                value={`${weeklyProgress.currentStreak}`}
                unit="週"
                color={colors.gold}
              />
            </View>

            <View style={styles.weekStrip}>
              {weekDays.map((day) => (
                <View
                  key={day.dateKey}
                  style={[
                    styles.weekDay,
                    day.isToday ? styles.weekDayToday : null,
                  ]}
                >
                  <Text style={[styles.weekWeekday, day.isToday ? styles.weekTextToday : null]}>
                    {day.weekday}
                  </Text>
                  <Text style={[styles.weekDate, day.isToday ? styles.weekTextToday : null]}>
                    {day.day}
                  </Text>
                  <Text style={[styles.weekCount, day.isToday ? styles.weekTextToday : null]}>
                    {day.done}/{day.total}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.heroActions}>
              <GameButton
                label="＋ クエストを追加"
                onPress={() => openNewTask()}
                style={styles.heroAction}
              />
              <GameButton
                label={showPlanner ? '計画を閉じる' : '週間計画'}
                variant="secondary"
                onPress={() => setShowPlanner((value) => !value)}
                style={styles.heroAction}
              />
            </View>
            <GameButton
              label="⏱ 即時開始（ストップウォッチ）"
              variant="secondary"
              onPress={() => setStopwatchOpen(true)}
            />
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

              {nextTask !== undefined && (
                <View style={styles.nextMission}>
                  <View style={styles.nextMissionIcon}>
                    <Text style={styles.nextMissionGlyph}>⚔</Text>
                  </View>
                  <View style={styles.nextMissionBody}>
                    <Text style={styles.nextMissionEyebrow}>NEXT MISSION</Text>
                    <Text style={styles.nextMissionTitle} numberOfLines={2}>
                      {nextTask.title}
                    </Text>
                    <Text style={styles.nextMissionMeta}>
                      {taskScheduleLabel(nextTask)} / {taskTimeLabel(nextTask)} /{' '}
                      {nextTask.timerMode === 'stopwatch'
                        ? 'ストップウォッチ'
                        : `${nextTask.estimatedMinutes}分`}
                    </Text>
                  </View>
                  <GameButton
                    label="出撃準備"
                    size="sm"
                    onPress={() => setSetupTaskId(nextTask.id)}
                    style={styles.nextMissionAction}
                  />
                </View>
              )}

              <Panel
                title="クエストボード"
                eyebrow="QUEST BOARD"
                subtitle="未完了のクエストを選んで出撃準備へ。集中した時間が報酬になります。"
                tone="primary"
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
                  <View style={styles.boardCount}>
                    <Text style={styles.boardCountValue}>{plannedTasks.length}</Text>
                    <Text style={styles.boardCountUnit}>件のクエスト</Text>
                  </View>
                  <Badge label="出撃可能" tone="primary" />
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
                          timerMode={task.timerMode}
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
      <StopwatchStartModal
        open={stopwatchOpen}
        onClose={() => setStopwatchOpen(false)}
      />
      <RecurrenceEditorModal
        open={ruleEditor !== null}
        rule={ruleEditor?.rule}
        onClose={() => setRuleEditor(null)}
      />
    </>
  );
}

function StreakPill({ streak }: { streak: number }) {
  return (
    <View style={styles.streakPill}>
      <View style={styles.streakIcon}>
        <Text style={styles.streakIconText}>✦</Text>
      </View>
      <View>
        <Text style={styles.streakLabel}>STREAK</Text>
        <Text style={styles.streakValue}>
          {streak}
          <Text style={styles.streakUnit}>週</Text>
        </Text>
      </View>
    </View>
  );
}

function MissionStat({
  glyph,
  label,
  value,
  unit,
  color,
}: {
  glyph: string;
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <View style={styles.heroStat}>
      <View style={[styles.heroStatIcon, { backgroundColor: withAlpha(color, 0.13) }]}>
        <Text style={[styles.heroStatGlyph, { color }]}>{glyph}</Text>
      </View>
      <View style={styles.heroStatBody}>
        <Text style={styles.heroStatLabel}>{label}</Text>
        <Text style={styles.heroStatValue}>
          {value}
          <Text style={styles.heroStatUnit}>{unit}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.goldSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#f0d18c',
    paddingHorizontal: 9,
    paddingVertical: 5,
    ...shadows.soft,
  },
  streakIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
  },
  streakIconText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  streakLabel: {
    color: '#a86a00',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },
  streakValue: {
    color: '#8a5600',
    fontSize: fontSize.lg,
    fontWeight: '900',
    lineHeight: 17,
  },
  streakUnit: {
    fontSize: 9,
    fontWeight: '800',
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  heroSky: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 150,
    backgroundColor: colors.primaryPale,
  },
  heroSun: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    right: -52,
    top: -70,
    backgroundColor: withAlpha(colors.gold, 0.16),
  },
  heroOrb: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    left: -48,
    bottom: -54,
    backgroundColor: withAlpha(colors.secondary, 0.1),
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroTitleWrap: {
    flex: 1,
    gap: 1,
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroEyebrowDot: {
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  heroEyebrow: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
  heroSub: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  heroRate: {
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  heroRateLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  heroRateValue: {
    color: colors.primaryDark,
    fontSize: fontSize.xxl,
    fontWeight: '900',
    lineHeight: 30,
  },
  heroRateSub: {
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: '700',
  },
  heroProgress: {
    gap: spacing.xs,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  progressValue: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  heroStats: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  heroStat: {
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
  heroStatIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatGlyph: {
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  heroStatBody: {
    gap: 0,
  },
  heroStatLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  heroStatValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '900',
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  heroStatUnit: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
  },
  weekStrip: {
    flexDirection: 'row',
    gap: 4,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 5,
    gap: 0,
  },
  weekDayToday: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  weekWeekday: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  weekDate: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
    lineHeight: 17,
  },
  weekCount: {
    color: colors.textSubtle,
    fontSize: 8,
    fontWeight: '700',
  },
  weekTextToday: {
    color: colors.white,
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroAction: {
    flex: 1,
  },
  nextMission: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#cfc7ff',
    padding: spacing.sm,
    ...shadows.soft,
  },
  nextMissionIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  nextMissionGlyph: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  nextMissionBody: {
    flex: 1,
    gap: 1,
  },
  nextMissionEyebrow: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  nextMissionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  nextMissionMeta: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  nextMissionAction: {
    minWidth: 86,
  },
  boardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  boardCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
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
    fontVariant: ['tabular-nums'],
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
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
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
    opacity: 0.82,
  },
});
