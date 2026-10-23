import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, SelectInput, TextArea, TextInput } from '../../components/ui/Field';
import { useAppStore } from '../../stores/appStore';

/** タスク作成フォーム */
export function TaskForm() {
  const createTask = useAppStore((s) => s.createTask);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('勉強');
  const [subject, setSubject] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim() === '') return;
    createTask({ title, description, category, subject, estimatedMinutes });
    setTitle('');
    setDescription('');
    setSubject('');
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
        <div className="field-row field-row--two">
          <Field label="カテゴリ" htmlFor="task-category">
            <SelectInput
              id="task-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="勉強">勉強</option>
              <option value="作業">作業</option>
              <option value="運動">運動</option>
              <option value="家事">家事</option>
              <option value="その他">その他</option>
            </SelectInput>
          </Field>
          <Field label="科目（任意）" htmlFor="task-subject">
            <TextInput
              id="task-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="例：数学"
              maxLength={30}
            />
          </Field>
        </div>
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
