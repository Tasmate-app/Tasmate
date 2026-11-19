import { useMemo } from 'react';
import {
  addDaysToKey,
  formatPercent,
  formatWeekRange,
  parseDateKey,
  requiredCompletedTasks,
  summarizeWeek,
  toDateKey,
  WEEKDAY_LABELS,
  weekdayNumber,
  weekStartKey,
} from '../../domain/weekly';
import { useAppStore } from '../../stores/appStore';

/** ホーム冒頭で今週の進み具合と曜日ごとの予定密度を示す */
export function HomeOverview() {
  const tasks = useAppStore((s) => s.tasks);
  const progress = useAppStore((s) => s.weeklyProgress);

  const weekStart = weekStartKey(new Date());
  const todayKey = toDateKey(new Date());
  const summary = useMemo(() => summarizeWeek(tasks, weekStart), [tasks, weekStart]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const dateKey = addDaysToKey(weekStart, index);
        const dayTasks = tasks.filter(
          (task) => task.archivedAt === undefined && task.scheduledDate === dateKey,
        );
        return {
          key: dateKey,
          date: parseDateKey(dateKey),
          scheduled: dayTasks.length,
          completed: dayTasks.filter((task) => task.status === 'completed').length,
        };
      }),
    [tasks, weekStart],
  );

  const required = requiredCompletedTasks(summary.eligibleTaskCount);
  const remaining = Math.max(0, required - summary.completedTaskCount);
  const rate = Math.min(100, (summary.completionRate ?? 0) * 100);

  return (
    <section className="home-overview" aria-label="今週の進捗">
      <div className="home-overview__head">
        <div>
          <h2>今週の進捗</h2>
          <p className="home-overview__range">{formatWeekRange(weekStart)}</p>
        </div>
        <span className="status-chip">連続 {progress.currentStreak}週</span>
      </div>

      <ol className="home-week" aria-label="曜日ごとの予定">
        {days.map((day) => {
          const weekday = WEEKDAY_LABELS[weekdayNumber(day.date) - 1];
          const isToday = day.key === todayKey;
          return (
            <li
              key={day.key}
              className={`home-week__day${isToday ? ' is-today' : ''}${
                day.completed > 0 ? ' is-done' : ''
              }`}
              aria-current={isToday ? 'date' : undefined}
            >
              <span className="home-week__label">{weekday}</span>
              <strong>{day.date.getDate()}</strong>
              <span className="home-week__count">
                {day.scheduled === 0 ? '—' : `${day.completed}/${day.scheduled}`}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="home-overview__progress">
        <div className="home-overview__numbers">
          <p>
            <strong>{summary.completedTaskCount}</strong>
            <span> / {summary.eligibleTaskCount} 件完了</span>
          </p>
          <strong className="home-overview__rate">{formatPercent(summary.completionRate)}</strong>
        </div>
        <div className="progress-bar progress-bar--large" aria-hidden="true">
          <span style={{ width: `${rate}%` }} />
        </div>
        <p className="home-overview__note">
          {summary.eligibleTaskCount === 0
            ? '今週の予定はまだありません。計画を立てて最初のクエストを追加しましょう。'
            : remaining === 0
              ? '80%に到達しています。このまま完了数を維持しましょう。'
              : `あと ${remaining} 件完了すると週間達成です（80%基準）。`}
        </p>
      </div>
    </section>
  );
}
