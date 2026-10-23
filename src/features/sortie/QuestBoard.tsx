import { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, SelectInput } from '../../components/ui/Field';
import { CHARACTER_DEFINITIONS, DESTINATIONS } from '../../data/seed';
import { useAppStore } from '../../stores/appStore';
import { QuestCreateModal } from './QuestCreateModal';

/** クエスト選択＋出撃準備（タスクをクエストとして扱う） */
export function QuestBoard() {
  const tasks = useAppStore((s) => s.tasks);
  const characters = useAppStore((s) => s.characters);
  const activeSession = useAppStore((s) => s.activeSession);
  const startSession = useAppStore((s) => s.startSession);
  const deleteTask = useAppStore((s) => s.deleteTask);

  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [destinationId, setDestinationId] = useState(DESTINATIONS[0].id);
  const [characterIds, setCharacterIds] = useState<string[]>(['c-hinata']);
  const [modalOpen, setModalOpen] = useState(false);

  const plannedTasks = tasks.filter((t) => t.status === 'planned');
  const selectedTask = plannedTasks.find((t) => t.id === selectedTaskId) ?? plannedTasks[0] ?? null;
  const destination = DESTINATIONS.find((d) => d.id === destinationId);

  const toggleCharacter = (id: string) => {
    setCharacterIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  return (
    <div className="sortie-grid">
      <Card title="クエスト選択">
        <div className="btn-row" style={{ marginTop: 0, marginBottom: 12 }}>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            新しいクエストを作成
          </Button>
        </div>
        {plannedTasks.length === 0 ? (
          <p className="list-item__meta">
            開始できるクエストがありません。新しいクエストを作成してください。
          </p>
        ) : (
          <ul className="list quest-list">
            {plannedTasks.map((t) => {
              const selected = selectedTask?.id === t.id;
              return (
                <li key={t.id} className={`list-item quest${selected ? ' is-selected' : ''}`}>
                  <button
                    type="button"
                    className="quest__select"
                    onClick={() => setSelectedTaskId(t.id)}
                    aria-pressed={selected}
                  >
                    <span className="list-item__title">{t.title}</span>
                    <span className="list-item__meta">
                      <Badge>予定</Badge> {t.category}
                      {t.subject !== undefined && t.subject !== '' ? ` / ${t.subject}` : ''} /
                      予定 {t.estimatedMinutes} 分
                    </span>
                    {t.description !== '' && (
                      <span className="list-item__meta">{t.description}</span>
                    )}
                  </button>
                  <div className="btn-row">
                    <Button
                      variant="danger"
                      disabled={activeSession?.taskId === t.id}
                      onClick={() => deleteTask(t.id)}
                    >
                      削除
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="出撃準備">
        {selectedTask === null ? (
          <p className="list-item__meta">クエストを選択すると出撃準備ができます。</p>
        ) : (
          <>
            <p className="list-item__title">{selectedTask.title}</p>
            <p className="list-item__meta">
              予定 {selectedTask.estimatedMinutes} 分
              {destination !== undefined && ` ／ 派遣先：${destination.name}`}
            </p>
            <Field label="派遣先（探索先）" htmlFor="sortie-destination">
              <SelectInput
                id="sortie-destination"
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
              >
                {DESTINATIONS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.description}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="派遣キャラクター" htmlFor="sortie-characters">
              <div className="checkbox-list" id="sortie-characters">
                {characters.map((c) => {
                  const def = CHARACTER_DEFINITIONS.find((d) => d.id === c.definitionId);
                  return (
                    <label key={c.definitionId}>
                      <input
                        type="checkbox"
                        checked={characterIds.includes(c.definitionId)}
                        onChange={() => toggleCharacter(c.definitionId)}
                      />
                      {def?.name ?? c.definitionId}（Lv.{c.level}）
                    </label>
                  );
                })}
              </div>
            </Field>
            <Button
              disabled={characterIds.length === 0}
              onClick={() => startSession(selectedTask.id, destinationId, characterIds)}
            >
              出撃（作業開始）
            </Button>
          </>
        )}
      </Card>

      <QuestCreateModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
