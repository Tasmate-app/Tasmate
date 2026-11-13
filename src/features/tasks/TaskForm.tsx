import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useAppStore } from '../../stores/appStore';
import type { TimerMode } from '../../types/index';
import { CategorySelectFields, type CategorySelection } from '../taxonomy/CategorySelectFields';
import { createDefaultCategorySelection } from '../taxonomy/categorySelection';

const TIMER_MODE_OPTIONS: ReadonlyArray<{ value: TimerMode; label: string }> = [
  { value: 'estimate', label: '予定時間' },
  { value: 'stopwatch', label: 'ストップウォッチ' },
];

/** タスク作成フォーム */
export function TaskForm() {
  const createTask = useAppStore((s) => s.createTask);
  const categories = useAppStore((s) => s.categories);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selection, setSelection] = useState<CategorySelection>(() =>
    createDefaultCategorySelection(categories),
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
  const [timerMode, setTimerMode] = useState<TimerMode>('estimate');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim() === '') return;
    createTask({
      title,
      description,
      category: '',
      categoryId: selection.categoryId === '' ? undefined : selection.categoryId,
      subCategoryId: selection.subCategoryId === '' ? undefined : selection.subCategoryId,
      estimatedMinutes: timerMode === 'stopwatch' ? 0 : estimatedMinutes,
      timerMode: timerMode === 'stopwatch' ? 'stopwatch' : undefined,
    });
    setTitle('');
    setDescription('');
    setSelection({ categoryId: selection.categoryId, subCategoryId: '' });
    setEstimatedMinutes(25);
    setTimerMode('estimate');
  };

  return (
    <Card title="タスクを作成">
      <form onSubmit={onSubmit}>
        <Field label="タスク名（必須）" htmlFor="task-title">
          <TextInput
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：数学の問題集 p.40-50"
            maxLength={100}
            required
          />
        </Field>
        <Field label="内容・メモ" htmlFor="task-desc">
          <TextArea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例：関数の応用問題を解く"
            maxLength={500}
          />
        </Field>
        <CategorySelectFields idPrefix="task" value={selection} onChange={setSelection} />
        <SegmentedControl
          label="計測方式"
          options={TIMER_MODE_OPTIONS}
          value={timerMode}
          onChange={setTimerMode}
        />
        {timerMode === 'stopwatch' ? (
          <p className="list-item__meta">
            予定時間なしで登録します。終了時の実作業時間を記録します。
          </p>
        ) : (
          <Field label="予定時間（分）" htmlFor="task-estimated">
            <TextInput
              id="task-estimated"
              type="number"
              min={1}
              max={480}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
            />
          </Field>
        )}
        <Button type="submit" disabled={title.trim() === ''}>
          タスクを追加
        </Button>
      </form>
    </Card>
  );
}
