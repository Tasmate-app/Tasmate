import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import {
  isValidTimeRange,
  parseDateKey,
  weekdayNumber,
  WEEKDAY_LABELS,
} from '../../domain/weekly';
import { useAppStore } from '../../stores/appStore';
import type { Task, TimerMode } from '../../types/index';
import { CategorySelectFields, type CategorySelection } from '../taxonomy/CategorySelectFields';
import { createDefaultCategorySelection } from '../taxonomy/categorySelection';

const TIMER_MODE_OPTIONS: ReadonlyArray<{ value: TimerMode; label: string }> = [
  { value: 'estimate', label: '予定時間' },
  { value: 'stopwatch', label: 'ストップウォッチ' },
];

interface CalendarTaskModalProps {
  open: boolean;
  initialDate: string;
  task?: Task;
  onClose: () => void;
}

/** 週間カレンダーの予定作成・編集モーダル */
export function CalendarTaskModal({ open, initialDate, task, onClose }: CalendarTaskModalProps) {
  const createTask = useAppStore((s) => s.createTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const createRecurrenceRule = useAppStore((s) => s.createRecurrenceRule);
  const categories = useAppStore((s) => s.categories);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selection, setSelection] = useState<CategorySelection>(() =>
    createDefaultCategorySelection(categories),
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
  const [timerMode, setTimerMode] = useState<TimerMode>('estimate');
  const [date, setDate] = useState(initialDate);
  const [hasTime, setHasTime] = useState(false);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [repeat, setRepeat] = useState(false);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [error, setError] = useState('');

  const isEdit = task !== undefined;

  useEffect(() => {
    if (!open) return;
    if (task !== undefined) {
      setTitle(task.title);
      setDescription(task.description);
      setSelection({
        categoryId: task.categoryId ?? createDefaultCategorySelection(categories).categoryId,
        subCategoryId: task.subCategoryId ?? '',
      });
      setEstimatedMinutes(task.timerMode === 'stopwatch' ? 25 : task.estimatedMinutes);
      setDate(task.scheduledDate ?? initialDate);
      const timed = task.startTime !== undefined && task.endTime !== undefined;
      setHasTime(timed);
      setStartTime(task.startTime ?? '18:00');
      setEndTime(task.endTime ?? '19:00');
      setTimerMode(task.timerMode === 'stopwatch' ? 'stopwatch' : 'estimate');
      setRepeat(false);
    } else {
      setTitle('');
      setDescription('');
      setSelection(createDefaultCategorySelection(categories));
      setEstimatedMinutes(25);
      setTimerMode('estimate');
      setDate(initialDate);
      setHasTime(false);
      setStartTime('18:00');
      setEndTime('19:00');
      setRepeat(false);
      setDaysOfWeek([weekdayNumber(parseDateKey(initialDate))]);
    }
    setError('');
  }, [open, task, initialDate, categories]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggleDay = (day: number) => {
    setDaysOfWeek((previous) =>
      previous.includes(day) ? previous.filter((value) => value !== day) : [...previous, day].sort(),
    );
  };

  const handleTimerModeChange = (mode: TimerMode) => {
    setTimerMode(mode);
    if (mode === 'stopwatch') {
      setRepeat(false);
      return;
    }
    setEstimatedMinutes((previous) => (previous >= 1 ? previous : 25));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() === '') return;
    if (hasTime && !isValidTimeRange(startTime, endTime)) {
      setError('終了時刻は開始時刻より後に設定してください。');
      return;
    }
    if (!isEdit && repeat && daysOfWeek.length === 0) {
      setError('繰り返す曜日を1つ以上選択してください。');
      return;
    }
    const schedule = {
      scheduledDate: date,
      startTime: hasTime ? startTime : undefined,
      endTime: hasTime ? endTime : undefined,
    };
    const stopwatch = timerMode === 'stopwatch';
    const input = {
      title: title.trim(),
      description: description.trim(),
      category: '',
      categoryId: selection.categoryId === '' ? undefined : selection.categoryId,
      subCategoryId: selection.subCategoryId === '' ? undefined : selection.subCategoryId,
      estimatedMinutes: stopwatch ? 0 : estimatedMinutes,
      timerMode: stopwatch ? ('stopwatch' as const) : undefined,
      ...schedule,
    };

    if (task !== undefined) {
      updateTask(task.id, input);
    } else if (repeat) {
      createRecurrenceRule({
        title,
        description,
        category: '',
        categoryId: selection.categoryId === '' ? undefined : selection.categoryId,
        subCategoryId: selection.subCategoryId === '' ? undefined : selection.subCategoryId,
        estimatedMinutes,
        daysOfWeek,
        startTime: hasTime ? startTime : undefined,
        endTime: hasTime ? endTime : undefined,
        effectiveFrom: date,
      });
    } else {
      createTask(input);
    }
    onClose();
  };

  const onDelete = () => {
    if (task === undefined) return;
    deleteTask(task.id);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <section
        className="modal calendar-modal"
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? '予定を編集' : '予定を追加'}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{isEdit ? '予定を編集' : '予定を追加'}</h2>
        {task?.recurrenceId !== undefined && (
          <p className="list-item__meta">
            この予定は繰り返しルールから生成されています。ここでの変更は今回の予定だけに適用されます。
          </p>
        )}
        <form onSubmit={onSubmit}>
          <Field label="予定名（必須）" htmlFor="calendar-title">
            <TextInput
              id="calendar-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例：英語の長文読解"
              maxLength={100}
              required
              autoFocus
            />
          </Field>
          <Field label="内容・メモ" htmlFor="calendar-desc">
            <TextArea
              id="calendar-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
            />
          </Field>
          <CategorySelectFields idPrefix="calendar" value={selection} onChange={setSelection} />
          <SegmentedControl
            label="計測方式"
            options={TIMER_MODE_OPTIONS}
            value={timerMode}
            onChange={handleTimerModeChange}
          />
          {timerMode === 'stopwatch' && (
            <p className="list-item__meta">
              予定時間なしで登録します。終了時の実作業時間を記録します。
            </p>
          )}
          <div className={timerMode === 'estimate' ? 'field-row field-row--two' : undefined}>
            <Field label="予定日" htmlFor="calendar-date">
              <TextInput
                id="calendar-date"
                type="date"
                value={date}
                onChange={(event) => {
                  const nextDate = event.target.value;
                  setDate(nextDate);
                  if (!isEdit && repeat && daysOfWeek.length === 1 && nextDate !== '') {
                    setDaysOfWeek([weekdayNumber(parseDateKey(nextDate))]);
                  }
                }}
                required
              />
            </Field>
            {timerMode === 'estimate' && (
              <Field label="予定時間（分）" htmlFor="calendar-minutes">
                <TextInput
                  id="calendar-minutes"
                  type="number"
                  min={1}
                  max={480}
                  value={estimatedMinutes}
                  onChange={(event) => setEstimatedMinutes(Number(event.target.value))}
                />
              </Field>
            )}
          </div>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={hasTime}
              onChange={(event) => setHasTime(event.target.checked)}
            />
            開始・終了時刻を指定する
          </label>
          {hasTime && (
            <div className="field-row field-row--two">
              <Field label="開始時刻" htmlFor="calendar-start">
                <TextInput
                  id="calendar-start"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                />
              </Field>
              <Field label="終了時刻" htmlFor="calendar-end">
                <TextInput
                  id="calendar-end"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  required
                />
              </Field>
            </div>
          )}

          {!isEdit && timerMode === 'stopwatch' && (
            <p className="list-item__meta">
              ストップウォッチ形式は繰り返し予定に対応していません。
            </p>
          )}

          {!isEdit && timerMode !== 'stopwatch' && (
            <>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={repeat}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setRepeat(checked);
                    if (checked && daysOfWeek.length <= 1 && date !== '') {
                      setDaysOfWeek([weekdayNumber(parseDateKey(date))]);
                    }
                  }}
                />
                毎週くり返す
              </label>
              {repeat && (
                <div className="field">
                  <span className="field__label">繰り返す曜日</span>
                  <div className="weekday-picker" role="group" aria-label="繰り返す曜日">
                    {WEEKDAY_LABELS.map((label, index) => {
                      const day = index + 1;
                      const selected = daysOfWeek.includes(day);
                      return (
                        <button
                          key={label}
                          type="button"
                          className={`weekday-pill${selected ? ' is-selected' : ''}`}
                          aria-pressed={selected}
                          onClick={() => toggleDay(day)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {error !== '' && <p className="form-error">{error}</p>}

          <div className="btn-row">
            <Button type="submit" disabled={title.trim() === ''}>
              {isEdit ? '保存' : '予定を追加'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              キャンセル
            </Button>
            {isEdit && (
              <Button type="button" variant="danger" onClick={onDelete}>
                この予定を削除
              </Button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
