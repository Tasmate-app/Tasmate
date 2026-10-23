import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '../../components/ui/Field';
import { useAppStore } from '../../stores/appStore';

interface QuestCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

/** クエスト（タスク）作成モーダル。一覧とは独立したパネルで表示する */
export function QuestCreateModal({ open, onClose, onCreated }: QuestCreateModalProps) {
  const createTask = useAppStore((s) => s.createTask);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('勉強');
  const [subject, setSubject] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim() === '') return;
    createTask({ title, description, category, subject, estimatedMinutes });
    setTitle('');
    setDescription('');
    setSubject('');
    setEstimatedMinutes(25);
    onCreated?.();
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="新しいクエストを作成"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>新しいクエスト</h2>
        <p className="list-item__meta">現実で取り組む内容をクエストとして登録します。</p>
        <form onSubmit={onSubmit}>
          <Field label="クエスト名（必須）" htmlFor="quest-title">
            <TextInput
              id="quest-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：数学の問題集 p.40-50"
              maxLength={100}
              required
              autoFocus
            />
          </Field>
          <Field label="内容・メモ" htmlFor="quest-desc">
            <TextArea
              id="quest-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例：関数の応用問題を解く"
              maxLength={500}
            />
          </Field>
          <div className="field-row field-row--two">
            <Field label="カテゴリ" htmlFor="quest-category">
              <SelectInput
                id="quest-category"
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
            <Field label="科目（任意）" htmlFor="quest-subject">
              <TextInput
                id="quest-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="例：数学"
                maxLength={30}
              />
            </Field>
          </div>
          <Field label="予定時間（分）" htmlFor="quest-estimated">
            <TextInput
              id="quest-estimated"
              type="number"
              min={1}
              max={480}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
            />
          </Field>
          <div className="btn-row">
            <Button type="submit" disabled={title.trim() === ''}>
              クエストを追加
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              閉じる
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
