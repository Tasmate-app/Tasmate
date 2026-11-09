import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { useAppStore } from '../../stores/appStore';
import { CategorySelectFields, type CategorySelection } from '../taxonomy/CategorySelectFields';

/** タスク作成フォーム */
export function TaskForm() {
  const createTask = useAppStore((s) => s.createTask);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selection, setSelection] = useState<CategorySelection>({
    categoryId: '',
    subCategoryId: '',
  });
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim() === '') return;
    createTask({
      title,
      description,
      category: '',
      categoryId: selection.categoryId === '' ? undefined : selection.categoryId,
      subCategoryId: selection.subCategoryId === '' ? undefined : selection.subCategoryId,
      estimatedMinutes,
    });
    setTitle('');
    setDescription('');
    setSelection({ categoryId: selection.categoryId, subCategoryId: '' });
    setEstimatedMinutes(25);
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
        <Button type="submit" disabled={title.trim() === ''}>
          タスクを追加
        </Button>
      </form>
    </Card>
  );
}
