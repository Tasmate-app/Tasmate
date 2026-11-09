import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { isValidTimeRange, WEEKDAY_LABELS } from '../../domain/weekly';
import { useAppStore } from '../../stores/appStore';
import type { RecurrenceRule } from '../../types/index';
import { CategorySelectFields, type CategorySelection } from '../taxonomy/CategorySelectFields';

interface RecurrenceRuleModalProps {
  rule?: RecurrenceRule;
  onClose: () => void;
}

/** 繰り返しルールの編集モーダル。過去の完了記録は変更しない */
export function RecurrenceRuleModal({ rule, onClose }: RecurrenceRuleModalProps) {
  const updateRecurrenceRule = useAppStore((s) => s.updateRecurrenceRule);
  const deleteRecurrenceRule = useAppStore((s) => s.deleteRecurrenceRule);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selection, setSelection] = useState<CategorySelection>({
    categoryId: '',
    subCategoryId: '',
  });
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [hasTime, setHasTime] = useState(true);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveUntil, setEffectiveUntil] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (rule === undefined) return;
    setTitle(rule.title);
    setDescription(rule.description);
    setSelection({
      categoryId: rule.categoryId ?? '',
      subCategoryId: rule.subCategoryId ?? '',
    });
    setEstimatedMinutes(rule.estimatedMinutes);
    setDaysOfWeek([...rule.daysOfWeek]);
    const timed = rule.startTime !== undefined && rule.endTime !== undefined;
    setHasTime(timed);
    setStartTime(rule.startTime ?? '18:00');
    setEndTime(rule.endTime ?? '19:00');
    setEffectiveFrom(rule.effectiveFrom);
    setEffectiveUntil(rule.effectiveUntil ?? '');
    setError('');
  }, [rule]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (rule === undefined) return null;

  const toggleDay = (day: number) => {
    setDaysOfWeek((previous) =>
      previous.includes(day) ? previous.filter((value) => value !== day) : [...previous, day].sort(),
    );
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() === '') return;
    if (daysOfWeek.length === 0) {
      setError('繰り返す曜日を1つ以上選択してください。');
      return;
    }
    if (hasTime && !isValidTimeRange(startTime, endTime)) {
      setError('終了時刻は開始時刻より後に設定してください。');
      return;
    }
    if (effectiveUntil !== '' && effectiveUntil < effectiveFrom) {
      setError('終了日は開始日以降に設定してください。');
      return;
    }
    updateRecurrenceRule(rule.id, {
      title: title.trim(),
      description: description.trim(),
      category: '',
      categoryId: selection.categoryId === '' ? undefined : selection.categoryId,
      subCategoryId: selection.subCategoryId === '' ? undefined : selection.subCategoryId,
      estimatedMinutes,
      daysOfWeek,
      startTime: hasTime ? startTime : undefined,
      endTime: hasTime ? endTime : undefined,
      effectiveFrom,
      effectiveUntil: effectiveUntil === '' ? undefined : effectiveUntil,
    });
    onClose();
  };

  const onDelete = () => {
    deleteRecurrenceRule(rule.id);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <section
        className="modal calendar-modal"
        role="dialog"
        aria-modal="true"
        aria-label="繰り返し設定を編集"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>繰り返し設定</h2>
        <p className="list-item__meta">
          変更は今後の予定に適用されます。過去の完了記録と確定済みの週次判定は変更しません。
        </p>
        <form onSubmit={onSubmit}>
          <Field label="予定名（必須）" htmlFor="rule-title">
            <TextInput
              id="rule-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              required
            />
          </Field>
          <Field label="内容・メモ" htmlFor="rule-desc">
            <TextArea
              id="rule-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
            />
          </Field>
          <CategorySelectFields idPrefix="rule" value={selection} onChange={setSelection} />
          <Field label="予定時間（分）" htmlFor="rule-minutes">
            <TextInput
              id="rule-minutes"
              type="number"
              min={1}
              max={480}
              value={estimatedMinutes}
              onChange={(event) => setEstimatedMinutes(Number(event.target.value))}
            />
          </Field>
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
              <Field label="開始時刻" htmlFor="rule-start">
                <TextInput
                  id="rule-start"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                />
              </Field>
              <Field label="終了時刻" htmlFor="rule-end">
                <TextInput
                  id="rule-end"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  required
                />
              </Field>
            </div>
          )}
          <div className="field-row field-row--two">
            <Field label="適用開始日" htmlFor="rule-from">
              <TextInput
                id="rule-from"
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
                required
              />
            </Field>
            <Field label="適用終了日（任意）" htmlFor="rule-until">
              <TextInput
                id="rule-until"
                type="date"
                value={effectiveUntil}
                onChange={(event) => setEffectiveUntil(event.target.value)}
              />
            </Field>
          </div>

          {error !== '' && <p className="form-error">{error}</p>}

          <div className="btn-row">
            <Button type="submit" disabled={title.trim() === ''}>
              保存
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="button" variant="danger" onClick={onDelete}>
              繰り返しを停止
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
