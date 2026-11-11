import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '../../components/ui/Field';
import { DESTINATIONS } from '../../data/seed';
import { useAppStore } from '../../stores/appStore';
import { CategorySelectFields, type CategorySelection } from '../taxonomy/CategorySelectFields';
import { PartyFormation } from './PartyFormation';

interface StopwatchStartModalProps {
  open: boolean;
  onClose: () => void;
}

/** 内容を設定したストップウォッチタスクを、その場で開始するモーダル */
export function StopwatchStartModal({ open, onClose }: StopwatchStartModalProps) {
  const characters = useAppStore((s) => s.characters);
  const startStopwatchTask = useAppStore((s) => s.startStopwatchTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selection, setSelection] = useState<CategorySelection>({
    categoryId: '',
    subCategoryId: '',
  });
  const [destinationId, setDestinationId] = useState(DESTINATIONS[0].id);
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setSelection({ categoryId: '', subCategoryId: '' });
    setDestinationId(DESTINATIONS[0].id);
    setCharacterIds(
      characters[0] !== undefined ? [characters[0].definitionId] : [],
    );
    setError('');
  }, [open, characters]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggleCharacter = (id: string) => {
    setCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const destination = DESTINATIONS.find((item) => item.id === destinationId) ?? DESTINATIONS[0];

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim() === '') return;
    if (characterIds.length === 0) {
      setError('派遣するキャラクターを1人以上選んでください。');
      return;
    }
    const sessionId = startStopwatchTask(
      {
        title,
        description,
        category: '',
        categoryId: selection.categoryId === '' ? undefined : selection.categoryId,
        subCategoryId: selection.subCategoryId === '' ? undefined : selection.subCategoryId,
      },
      destinationId,
      characterIds,
    );
    if (sessionId === null) {
      setError('計測を開始できませんでした。進行中の作業がないか確認してください。');
      return;
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="ストップウォッチで開始"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>ストップウォッチで開始</h2>
        <p className="list-item__meta">
          予定時間を決めず、今から経過時間を計測します。終了時に報酬を確定します。
        </p>
        <form onSubmit={onSubmit}>
          <Field label="タスク名（必須）" htmlFor="stopwatch-title">
            <TextInput
              id="stopwatch-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：数学の問題集 p.40-50"
              maxLength={100}
              required
              autoFocus
            />
          </Field>
          <Field label="内容・メモ" htmlFor="stopwatch-desc">
            <TextArea
              id="stopwatch-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例：関数の応用問題を解く"
              maxLength={500}
            />
          </Field>
          <CategorySelectFields
            idPrefix="stopwatch"
            value={selection}
            onChange={setSelection}
          />
          <Field label="派遣先（探索先）" htmlFor="stopwatch-destination">
            <SelectInput
              id="stopwatch-destination"
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
            >
              {DESTINATIONS.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.name} — {destination.description}
                </option>
              ))}
            </SelectInput>
          </Field>
          <PartyFormation
            characters={characters}
            selectedIds={characterIds}
            destination={destination}
            onToggle={toggleCharacter}
          />
          <p className="list-item__meta">
            <Badge>予定時間なし</Badge> 作業中は経過時間のみ表示されます。
          </p>
          {error !== '' && <p className="form-error">{error}</p>}
          <div className="btn-row">
            <Button type="submit" disabled={title.trim() === '' || characterIds.length === 0}>
              ストップウォッチで開始
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
