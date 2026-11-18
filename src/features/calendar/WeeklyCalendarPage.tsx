import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Button } from '../../components/ui/Button';
import {
  formatPercent,
  formatWeekRange,
  getWeekDates,
  isDateKeyInWeek,
  nextWeekStartKey,
  previousWeekStartKey,
  summarizeWeek,
  taskScheduledDateKey,
  timeToMinutes,
  toDateKey,
  WEEKDAY_LABELS,
  weekdayNumber,
  weekStartKey,
} from '../../domain/weekly';
import { useAppStore } from '../../stores/appStore';
import type { RecurrenceRule, Task } from '../../types/index';
import { CalendarTaskModal } from './CalendarTaskModal';
import { RecurrenceRuleModal } from './RecurrenceRuleModal';
import { WeeklyProgressPanel } from './WeeklyProgressPanel';

const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const CATEGORY_CLASS: Record<string, string> = {
  勉強: 'study',
  作業: 'work',
  運動: 'exercise',
  家事: 'chore',
  その他: 'other',
};

const STATUS_LABEL: Record<Task['status'], string> = {
  planned: '予定',
  active: '進行中',
  interrupted: '中断中',
  completed: '完了',
  cancelled: '取消',
};

function timeLabel(task: Task): string {
  if (task.startTime !== undefined && task.endTime !== undefined) {
    return `${task.startTime}–${task.endTime}`;
  }
  return '時間未設定';
}

function taskPosition(task: Task): CSSProperties | undefined {
  if (task.startTime === undefined || task.endTime === undefined) return undefined;
  const start = timeToMinutes(task.startTime);
  const end = timeToMinutes(task.endTime);
  const top = (start / 60) * HOUR_HEIGHT;
  const height = Math.max(24, ((end - start) / 60) * HOUR_HEIGHT - 3);
  return { top: `${top}px`, height: `${height}px` };
}

function isShortTask(task: Task): boolean {
  if (task.startTime === undefined || task.endTime === undefined) return false;
  return timeToMinutes(task.endTime) - timeToMinutes(task.startTime) <= 30;
}

/** 週間カレンダー。予定の作成・編集、繰り返し、週次の継続状況をまとめる */
export function WeeklyCalendarPage() {
  const tasks = useAppStore((s) => s.tasks);
  const rules = useAppStore((s) => s.recurrenceRules);
  const ensureRecurringOccurrencesForWeek = useAppStore(
    (s) => s.ensureRecurringOccurrencesForWeek,
  );

  const [weekStart, setWeekStart] = useState(() => weekStartKey(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => toDateKey(new Date()));
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<RecurrenceRule | undefined>();
  const [now, setNow] = useState(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const todayKey = toDateKey(now);
  const isCurrentWeek = weekStart === weekStartKey(now);
  const days = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const summary = useMemo(() => summarizeWeek(tasks, weekStart), [tasks, weekStart]);

  useEffect(() => {
    ensureRecurringOccurrencesForWeek(weekStart);
  }, [weekStart, ensureRecurringOccurrencesForWeek]);

  useEffect(() => {
    setSelectedDay(isDateKeyInWeek(todayKey, weekStart) ? todayKey : weekStart);
  }, [weekStart, todayKey]);

  useEffect(() => {
    const current = new Date();
    const focusHour =
      weekStart === weekStartKey(current) ? Math.max(0, current.getHours() - 2) : 7;
    scrollRef.current?.scrollTo({ top: focusHour * HOUR_HEIGHT });
  }, [weekStart]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const tasksForDay = (dateKey: string): Task[] =>
    tasks.filter(
      (task) => task.archivedAt === undefined && taskScheduledDateKey(task) === dateKey,
    );

  const openCreate = (dateKey: string) => {
    setEditingTask(undefined);
    setCreateDate(dateKey);
  };

  const openEdit = (task: Task) => {
    setCreateDate(null);
    setEditingTask(task);
  };

  const closeTaskModal = () => {
    setEditingTask(undefined);
    setCreateDate(null);
  };

  const modalDate =
    editingTask?.scheduledDate ??
    (editingTask !== undefined ? weekStart : (createDate ?? selectedDay));

  const nowTop =
    ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * (HOUR_HEIGHT * 24);

  return (
    <div className="game-container calendar-page">
      <header className="calendar-page__hero">
        <div>
          <p className="eyebrow">WEEKLY PLANNER</p>
          <h1 className="game-screen__title">週間カレンダー</h1>
          <p className="calendar-page__lead">
            予定を組み、80%達成で連続週数を伸ばそう。未達成でも1週ずつしか減りません。
          </p>
        </div>
        <div className="calendar-page__hero-actions">
          <Button type="button" onClick={() => openCreate(selectedDay)}>
            予定を追加
          </Button>
        </div>
      </header>

      <WeeklyProgressPanel />

      <section className="panel week-calendar-panel" aria-label="週間カレンダー">
        <div className="calendar-toolbar">
          <div className="calendar-toolbar__nav">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setWeekStart(previousWeekStartKey(weekStart))}
              aria-label="前の週"
            >
              ‹
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setWeekStart(weekStartKey(new Date()))}
            >
              今週
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setWeekStart(nextWeekStartKey(weekStart))}
              aria-label="次の週"
            >
              ›
            </Button>
          </div>
          <div className="calendar-toolbar__range">
            <strong>{formatWeekRange(weekStart)}</strong>
            {isCurrentWeek && <span className="status-chip">今週</span>}
          </div>
          <div className="calendar-toolbar__summary">
            <span>完了 {summary.completedTaskCount} / {summary.eligibleTaskCount}</span>
            <strong>{formatPercent(summary.completionRate)}</strong>
          </div>
        </div>

        <div className="week-calendar">
          <div className="week-calendar__head">
            <div className="week-calendar__corner" aria-hidden="true" />
            {days.map((day) => {
              const dateKey = toDateKey(day);
              const isToday = dateKey === todayKey;
              return (
                <div
                  key={dateKey}
                  className={`week-calendar__day-head${isToday ? ' is-today' : ''}`}
                >
                  <div>
                    <span>{WEEKDAY_LABELS[weekdayNumber(day) - 1]}</span>
                    <strong>{day.getDate()}</strong>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`${day.getMonth() + 1}月${day.getDate()}日に予定を追加`}
                    onClick={() => openCreate(dateKey)}
                  >
                    ＋
                  </button>
                </div>
              );
            })}
          </div>

          <div className="week-calendar__scroll" ref={scrollRef}>
            <div
              className="week-calendar__body"
              style={{ height: `${HOUR_HEIGHT * 24}px` } as CSSProperties}
            >
              <div className="week-calendar__axis" aria-hidden="true">
                {HOURS.filter((hour) => hour % 3 === 0).map((hour) => (
                  <span key={hour} style={{ top: `${hour * HOUR_HEIGHT}px` }}>
                    {String(hour).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
              {days.map((day) => {
                const dateKey = toDateKey(day);
                const isToday = dateKey === todayKey;
                const dayTasks = tasksForDay(dateKey).filter(
                  (task) => task.startTime !== undefined && task.endTime !== undefined,
                );
                return (
                  <div
                    key={dateKey}
                    className={`week-calendar__day${isToday ? ' is-today' : ''}`}
                  >
                    {dayTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        className={`week-task week-task--${CATEGORY_CLASS[task.category] ?? 'other'} week-task--${task.status}${isShortTask(task) ? ' is-short' : ''}`}
                        style={taskPosition(task)}
                        title={`${timeLabel(task)} ${task.title}`}
                        onClick={() => openEdit(task)}
                      >
                        <span className="week-task__time">{timeLabel(task)}</span>
                        <strong className="week-task__title">{task.title}</strong>
                        {task.status === 'completed' && (
                          <span className="week-task__status">{STATUS_LABEL[task.status]}</span>
                        )}
                      </button>
                    ))}
                    {isToday && (
                      <div
                        className="week-calendar__now"
                        style={{ top: `${nowTop}px` }}
                        aria-label="現在時刻"
                      >
                        <span />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="week-unscheduled">
            <div className="week-unscheduled__label">時間未設定</div>
            {days.map((day) => {
              const dateKey = toDateKey(day);
              const unscheduled = tasksForDay(dateKey).filter(
                (task) => task.startTime === undefined || task.endTime === undefined,
              );
              return (
                <div key={dateKey} className="week-unscheduled__day">
                  {unscheduled.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className={`week-task week-task--compact week-task--${CATEGORY_CLASS[task.category] ?? 'other'} week-task--${task.status}`}
                      onClick={() => openEdit(task)}
                    >
                      <strong className="week-task__title">{task.title}</strong>
                    </button>
                  ))}
                  {unscheduled.length === 0 && <span className="week-unscheduled__empty">—</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="week-mobile">
          <div className="week-mobile__days" role="tablist" aria-label="曜日を選択">
            {days.map((day) => {
              const dateKey = toDateKey(day);
              const selected = dateKey === selectedDay;
              return (
                <button
                  key={dateKey}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`week-mobile__day${selected ? ' is-selected' : ''}${dateKey === todayKey ? ' is-today' : ''}`}
                  onClick={() => setSelectedDay(dateKey)}
                >
                  <span>{WEEKDAY_LABELS[weekdayNumber(day) - 1]}</span>
                  <strong>{day.getDate()}</strong>
                </button>
              );
            })}
          </div>
          <div className="week-mobile__list">
            <div className="week-mobile__list-head">
              <strong>{selectedDay.replaceAll('-', '/')}</strong>
              <Button type="button" variant="secondary" onClick={() => openCreate(selectedDay)}>
                この日に追加
              </Button>
            </div>
            {tasksForDay(selectedDay).length === 0 ? (
              <p className="weekly-message">この日の予定はありません。</p>
            ) : (
              tasksForDay(selectedDay)
                .slice()
                .sort((a, b) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'))
                .map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className={`week-mobile-task week-task--${CATEGORY_CLASS[task.category] ?? 'other'}`}
                    onClick={() => openEdit(task)}
                  >
                    <span>{timeLabel(task)}</span>
                    <strong>{task.title}</strong>
                    <span className={`status-chip status-chip--${task.status}`}>
                      {STATUS_LABEL[task.status]}
                    </span>
                  </button>
                ))
            )}
          </div>
        </div>
      </section>

      <section className="panel recurrence-panel" aria-label="繰り返し予定">
        <div className="section-head">
          <div>
            <p className="eyebrow">ROUTINE</p>
            <h2>繰り返し予定</h2>
          </div>
        </div>
        {rules.length === 0 ? (
          <p className="weekly-message">
            「予定を追加」から「毎週くり返す」を選ぶと、曜日ごとの習慣予定を作成できます。
          </p>
        ) : (
          <ul className="recurrence-list">
            {rules.map((rule) => (
              <li key={rule.id} className="recurrence-list__item">
                <div className="recurrence-list__main">
                  <strong>{rule.title}</strong>
                  <span>
                    {rule.daysOfWeek
                      .map((day) => WEEKDAY_LABELS[day - 1])
                      .join('・')}
                    {rule.startTime !== undefined && rule.endTime !== undefined
                      ? ` ${rule.startTime}–${rule.endTime}`
                      : ' 時間未設定'}
                  </span>
                  <span className="list-item__meta">
                    {rule.effectiveFrom.replaceAll('-', '/')}
                    {rule.effectiveUntil !== undefined
                      ? ` 〜 ${rule.effectiveUntil.replaceAll('-', '/')}`
                      : ' 〜'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingRule(rule)}
                >
                  編集
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CalendarTaskModal
        open={editingTask !== undefined || createDate !== null}
        initialDate={modalDate}
        task={editingTask}
        onClose={closeTaskModal}
      />
      <RecurrenceRuleModal
        rule={editingRule}
        onClose={() => setEditingRule(undefined)}
      />
    </div>
  );
}
