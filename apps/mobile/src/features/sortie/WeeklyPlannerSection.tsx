import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RecurrenceRule, Task } from '@tasmate/types';
import {
  WEEKDAY_LABELS,
  formatPercent,
  formatWeekRange,
  getWeekDates,
  isDateKeyInWeek,
  multiplierForStreak,
  nextRankForStreak,
  nextWeekStartKey,
  previousWeekStartKey,
  rankForStreak,
  requiredCompletedTasks,
  summarizeWeek,
  taskScheduledDateKey,
  toDateKey,
  weekdayNumber,
  weekStartKey,
  weeklyStatusLabel,
} from '@tasmate/core';
import { useMobileAppStore } from '../../stores/appStore';
import { Badge, EmptyState, GameButton, Panel, ProgressBar, StatTile } from '../../ui';
import { useNow } from '../../hooks/useNow';
import { categoryColor, STATUS_LABELS, taskTimeLabel } from '../../lib/taskMeta';
import { colors, fontSize, radius, spacing } from '../../theme/tokens';

interface WeeklyPlannerSectionProps {
  onEditTask: (task: Task) => void;
  onCreateTask: (date: string) => void;
  onCreateRule: () => void;
  onEditRule: (rule: RecurrenceRule) => void;
}

const STATUS_TONES = {
  planned: 'neutral',
  active: 'running',
  completed: 'success',
  cancelled: 'danger',
} as const;

export function WeeklyPlannerSection({
  onEditTask,
  onCreateTask,
  onCreateRule,
  onEditRule,
}: WeeklyPlannerSectionProps) {
  const tasks = useMobileAppStore((s) => s.tasks);
  const rules = useMobileAppStore((s) => s.recurrenceRules);
  const progress = useMobileAppStore((s) => s.weeklyProgress);
  const evaluations = useMobileAppStore((s) => s.weeklyEvaluations);
  const restWeeks = useMobileAppStore((s) => s.restWeeks);
  const ensureRecurringOccurrencesForWeek = useMobileAppStore(
    (s) => s.ensureRecurringOccurrencesForWeek,
  );
  const toggleRestWeek = useMobileAppStore((s) => s.toggleRestWeek);

  const now = useNow(30_000);
  const todayKey = toDateKey(new Date(now));
  const currentWeek = weekStartKey(new Date(now));
  const [weekStart, setWeekStart] = useState(currentWeek);
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    ensureRecurringOccurrencesForWeek(weekStart);
  }, [weekStart, ensureRecurringOccurrencesForWeek]);

  useEffect(() => {
    setSelectedDay(isDateKeyInWeek(todayKey, weekStart) ? todayKey : weekStart);
  }, [weekStart, todayKey]);

  const days = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const summary = useMemo(() => summarizeWeek(tasks, weekStart), [tasks, weekStart]);
  const currentSummary = useMemo(
    () => summarizeWeek(tasks, currentWeek),
    [tasks, currentWeek],
  );
  const rank = rankForStreak(progress.currentStreak);
  const nextRank = nextRankForStreak(progress.currentStreak);
  const currentMultiplier = multiplierForStreak(progress.currentStreak);
  const required = requiredCompletedTasks(summary.eligibleTaskCount);
  const remaining = Math.max(0, required - summary.completedTaskCount);
  const isRest = restWeeks.includes(weekStart);
  const latest = evaluations[0];

  const rankProgress =
    nextRank === null
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            ((progress.currentStreak - rank.minStreak) /
              Math.max(1, nextRank.minStreak - rank.minStreak)) *
              100,
          ),
        );

  const tasksForDay = (dateKey: string): Task[] =>
    tasks
      .filter(
        (task) => task.archivedAt === undefined && taskScheduledDateKey(task) === dateKey,
      )
      .sort((a, b) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'));

  const selectedTasks = tasksForDay(selectedDay);

  const changeRestWeek = (week: string, label: string) => {
    const active = restWeeks.includes(week);
    const ok = toggleRestWeek(week);
    setFeedback(
      ok
        ? active
          ? `${label}の休憩設定を解除しました。`
          : `${label}を休憩週に設定しました。`
        : '休憩週を設定できません。連続利用の上限、または判定済みの週です。',
    );
  };

  return (
    <>
      <Panel title="週間の継続状況" eyebrow="WEEKLY STREAK" accentColor={colors.accent}>
        <View style={styles.rankHead}>
          <View style={styles.rankNameBlock}>
            <Text style={styles.rankLabel}>現在のランク</Text>
            <Text style={styles.rankName}>{rank.name}</Text>
          </View>
          <View style={styles.multiplier}>
            <Text style={styles.multiplierLabel}>報酬倍率</Text>
            <Text style={styles.multiplierValue}>×{currentMultiplier.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <StatTile label="連続達成" value={`${progress.currentStreak}週`} />
          <StatTile label="最高記録" value={`${progress.highestStreak}週`} />
          <StatTile label="累計達成" value={`${progress.totalSuccessfulWeeks}週`} />
        </View>

        <View style={styles.rankNext}>
          <View style={styles.rankNextRow}>
            <Text style={styles.rankNextLabel}>
              {nextRank === null ? '最高ランクに到達' : `次は ${nextRank.name}`}
            </Text>
            {nextRank !== null && (
              <Text style={styles.rankNextValue}>
                あと {Math.max(0, nextRank.minStreak - progress.currentStreak)}週
              </Text>
            )}
          </View>
          <ProgressBar value={rankProgress} color={colors.accent} height={9} />
        </View>
        <Text style={styles.note}>
          未達でも連続週数が1つ減るだけです。累計達成週数と最高記録は失われません。
        </Text>

        <View style={styles.restRow}>
          <GameButton
            label={isRest ? 'この週の休憩を解除' : 'この週を休憩週にする'}
            variant={isRest ? 'secondary' : 'ghost'}
            size="sm"
            onPress={() => changeRestWeek(weekStart, weekStart === currentWeek ? '今週' : 'この週')}
            style={styles.restButton}
          />
          <GameButton
            label={restWeeks.includes(nextWeekStartKey(currentWeek)) ? '来週の休憩を解除' : '来週を休憩週にする'}
            variant="ghost"
            size="sm"
            onPress={() => changeRestWeek(nextWeekStartKey(currentWeek), '来週')}
            style={styles.restButton}
          />
        </View>
        {feedback !== null && <Text style={styles.feedback}>{feedback}</Text>}
      </Panel>

      <Panel title="週間スケジュール" eyebrow="WEEKLY PLANNER" accentColor={colors.primary}>
        <View style={styles.weekToolbar}>
          <GameButton label="‹" size="sm" variant="secondary" onPress={() => setWeekStart(previousWeekStartKey(weekStart))} />
          <GameButton label="今週" size="sm" variant="ghost" onPress={() => setWeekStart(currentWeek)} />
          <GameButton label="›" size="sm" variant="secondary" onPress={() => setWeekStart(nextWeekStartKey(weekStart))} />
          <View style={styles.weekRange}>
            <Text style={styles.weekRangeText}>{formatWeekRange(weekStart)}</Text>
            {weekStart === currentWeek && <Badge label="今週" tone="primary" />}
          </View>
        </View>

        <View style={styles.weekSummary}>
          <Text style={styles.weekSummaryText}>
            完了 {summary.completedTaskCount} / {summary.eligibleTaskCount} 件
          </Text>
          <Text style={styles.weekRate}>{formatPercent(summary.completionRate)}</Text>
        </View>
        <ProgressBar
          value={Math.min(100, (summary.completionRate ?? 0) * 100)}
          height={10}
        />
        <Text style={styles.note}>
          {isRest
            ? 'この週は休憩週です。連続週数は維持されますが、達成には数えません。'
            : summary.eligibleTaskCount === 0
              ? 'この週の予定はまだありません。'
              : remaining === 0
                ? '80%に到達しています。このまま完了数を維持しましょう。'
                : `あと ${remaining} 件完了すると週間達成です（80%基準）。`}
        </Text>

        <View style={styles.dayStrip}>
          {days.map((day) => {
            const dateKey = toDateKey(day);
            const selected = dateKey === selectedDay;
            const isToday = dateKey === todayKey;
            const dayTasks = tasksForDay(dateKey);
            const done = dayTasks.filter((task) => task.status === 'completed').length;
            return (
              <Pressable
                key={dateKey}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setSelectedDay(dateKey)}
                style={({ pressed }) => [
                  styles.dayChip,
                  selected ? styles.dayChipSelected : null,
                  isToday ? styles.dayChipToday : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.dayWeekday, selected ? styles.dayTextSelected : null]}>
                  {WEEKDAY_LABELS[weekdayNumber(day) - 1]}
                </Text>
                <Text style={[styles.dayNumber, selected ? styles.dayTextSelected : null]}>
                  {day.getDate()}
                </Text>
                <Text style={[styles.dayCount, selected ? styles.dayTextSelected : null]}>
                  {done}/{dayTasks.length}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.selectedHead}>
          <View>
            <Text style={styles.selectedDate}>{selectedDay.replaceAll('-', '/')}</Text>
            <Text style={styles.note}>
              予定 {selectedTasks.length}件 / 完了 {selectedTasks.filter((task) => task.status === 'completed').length}件
            </Text>
          </View>
          <GameButton label="この日に追加" size="sm" onPress={() => onCreateTask(selectedDay)} />
        </View>

        {selectedTasks.length === 0 ? (
          <EmptyState message="この日の予定はありません。予定を追加して週間達成を目指しましょう。" />
        ) : (
          <View style={styles.taskList}>
            {selectedTasks.map((task) => (
              <Pressable
                key={task.id}
                accessibilityRole="button"
                onPress={() => onEditTask(task)}
                style={({ pressed }) => [styles.taskRow, pressed ? styles.pressed : null]}
              >
                <View style={[styles.taskBar, { backgroundColor: categoryColor(task.category) }]} />
                <View style={styles.taskBody}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                  <Text style={styles.taskMeta}>
                    {taskTimeLabel(task)} / {task.category} / {task.estimatedMinutes}分
                  </Text>
                </View>
                <Badge label={STATUS_LABELS[task.status]} tone={STATUS_TONES[task.status]} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.history}>
          <Text style={styles.sectionLabel}>直近の週次判定</Text>
          {latest === undefined ? (
            <Text style={styles.note}>週が終わると、ここに達成状況とランクの変化が記録されます。</Text>
          ) : (
            <View style={styles.latestRow}>
              <Badge
                label={weeklyStatusLabel(latest.status)}
                tone={latest.status === 'achieved' ? 'success' : latest.status === 'missed' ? 'danger' : 'neutral'}
              />
              <View style={styles.latestBody}>
                <Text style={styles.latestTitle}>{formatWeekRange(latest.weekStart)}</Text>
                <Text style={styles.note}>
                  達成率 {formatPercent(latest.completionRate)} / 連続 {latest.streakBefore}→{latest.streakAfter}週
                </Text>
              </View>
            </View>
          )}
          <Text style={styles.note}>
            今週の進捗: {currentSummary.completedTaskCount} / {currentSummary.eligibleTaskCount}件
          </Text>
        </View>
      </Panel>

      <Panel
        title="繰り返し予定"
        eyebrow="ROUTINE"
        accentColor={colors.secondary}
        right={<GameButton label="追加" size="sm" variant="ghost" onPress={onCreateRule} />}
      >
        {rules.length === 0 ? (
          <EmptyState message="毎週の習慣を登録すると、曜日ごとに予定が自動で作成されます。" />
        ) : (
          <View style={styles.ruleList}>
            {rules.map((rule) => (
              <Pressable
                key={rule.id}
                accessibilityRole="button"
                onPress={() => onEditRule(rule)}
                style={({ pressed }) => [styles.ruleRow, pressed ? styles.pressed : null]}
              >
                <View style={styles.ruleBody}>
                  <Text style={styles.taskTitle}>{rule.title}</Text>
                  <Text style={styles.taskMeta}>
                    {rule.daysOfWeek.map((day) => WEEKDAY_LABELS[day - 1]).join('・')}
                    {rule.startTime !== undefined && rule.endTime !== undefined
                      ? ` ${rule.startTime}-${rule.endTime}`
                      : ' 時間未設定'}
                  </Text>
                </View>
                <Text style={styles.editLabel}>編集</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Panel>
    </>
  );
}

const styles = StyleSheet.create({
  rankHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rankNameBlock: {
    flex: 1,
  },
  rankLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  rankName: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '900',
  },
  multiplier: {
    alignItems: 'flex-end',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  multiplierLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  multiplierValue: {
    color: colors.accent,
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rankNext: {
    gap: spacing.xs,
  },
  rankNextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rankNextLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  rankNextValue: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
  restRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  restButton: {
    flex: 1,
  },
  feedback: {
    color: colors.primaryDark,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  weekToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  weekRange: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  weekRangeText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  weekSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekSummaryText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  weekRate: {
    color: colors.primaryDark,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  dayStrip: {
    flexDirection: 'row',
    gap: 4,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 6,
    gap: 1,
  },
  dayChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipToday: {
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.78,
  },
  dayWeekday: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  dayNumber: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  dayCount: {
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: colors.white,
  },
  selectedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  selectedDate: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  taskList: {
    gap: spacing.xs,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    overflow: 'hidden',
  },
  taskBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 4,
  },
  taskBody: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  taskMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  history: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  latestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  latestBody: {
    flex: 1,
    gap: 2,
  },
  latestTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  ruleList: {
    gap: spacing.xs,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  ruleBody: {
    flex: 1,
    gap: 2,
  },
  editLabel: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '900',
  },
});
