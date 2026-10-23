import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '../../components/ui/Field';
import {
  isValidTimeRange,
  parseDateKey,
  weekdayNumber,
  WEEKDAY_LABELS,
} from '../../domain/weekly';
import { useAppStore } from '../../stores/appStore';
import type { Task } from '../../types/index';

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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('勉強');
  const [subject, setSubject] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
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
      setCategory(task.category);
      setSubject(task.subject ?? '');
      setEstimatedMinutes(task.estimatedMinutes);
      setDate(task.scheduledDate ?? initialDate);
      const timed = task.startTime !== undefined && task.endTime !== undefined;
      setHasTime(timed);
      setStartTime(task.startTime ?? '18:00');
      setEndTime(task.endTime ?? '19:00');
      setRepeat(false);
    } else {
      setTitle('');
      setDescription('');
      setCategory('勉強');
      setSubject('');
      setEstimatedMinutes(25);
      setDate(initialDate);
      setHasTime(false);
      setStartTime('18:00');
      setEndTime('19:00');
      setRepeat(false);
      setDaysOfWeek([weekdayNumber(parseDateKey(initialDate))]);
    }
    setError('');
  }, [open, task, initialDate]);

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

    if (task !== undefined) {
      updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        subject: subject.trim() === '' ? undefined : subject.trim(),
        estimatedMinutes,
        ...schedule,
      });
    } else if (repeat) {
      createRecurrenceRule({
        title,
        description,
        category,
        subject,
        estimatedMinutes,
        daysOfWeek,
        startTime: hasTime ? startTime : undefined,
        endTime: hasTime ? endTime : undefined,
        effectiveFrom: date,
      });
    } else {
      createTask({
        title,
        description,
        category,
        subject,
        estimatedMinutes,
        ...schedule,
      });
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
          <div className="field-row field-row--two">
            <Field label="カテゴリ" htmlFor="calendar-category">
              <SelectInput
                id="calendar-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="勉強">勉強</option>
                <option value="作業">作業</option>
                <option value="運動">運動</option>
                <option value="家事">家事</option>
                <option value="その他">その他</option>
              </SelectInput>
            </Field>
            <Field label="科目（任意）" htmlFor="calendar-subject">
              <TextInput
                id="calendar-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={30}
              />
            </Field>
          </div>
          <div className="field-row field-row--two">
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

          {!isEdit && (
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
