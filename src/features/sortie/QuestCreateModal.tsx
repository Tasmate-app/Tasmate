import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { useAppStore } from '../../stores/appStore';
import { CategorySelectFields, type CategorySelection } from '../taxonomy/CategorySelectFields';

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
  const [selection, setSelection] = useState<CategorySelection>({
    categoryId: '',
    subCategoryId: '',
  });
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
          <CategorySelectFields idPrefix="quest" value={selection} onChange={setSelection} />
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
