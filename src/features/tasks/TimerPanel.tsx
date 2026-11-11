import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, SelectInput } from '../../components/ui/Field';
import { MATERIAL_NAMES } from '../../domain/constants';
import { formatElapsed } from '../../domain/session';
import { useNow } from '../../hooks/useNow';
import { CHARACTER_DEFINITIONS, DESTINATIONS } from '../../data/seed';
import { sessionElapsedSeconds, useAppStore } from '../../stores/appStore';

/** タイマー（作業セッション開始・一時停止・再開・終了） */
export function TimerPanel() {
  const activeSession = useAppStore((s) => s.activeSession);
  const tasks = useAppStore((s) => s.tasks);
  const characters = useAppStore((s) => s.characters);
  const rewards = useAppStore((s) => s.rewards);
  const startSession = useAppStore((s) => s.startSession);
  const pauseSession = useAppStore((s) => s.pauseSession);
  const resumeSession = useAppStore((s) => s.resumeSession);
  const finishSession = useAppStore((s) => s.finishSession);
  const cancelSession = useAppStore((s) => s.cancelSession);

  const [taskId, setTaskId] = useState('');
  const [destinationId, setDestinationId] = useState(DESTINATIONS[0].id);
  const [characterIds, setCharacterIds] = useState<string[]>(['c-hinata']);
  const [lastRewardId, setLastRewardId] = useState<string | null>(null);

  // 表示専用の現在時刻（経過時間の算出は開始時刻基準で行う）
  const now = useNow(500, activeSession !== null && activeSession.state === 'running');
  const elapsed = useMemo(
    () => sessionElapsedSeconds(activeSession, now),
    [activeSession, now],
  );

  const plannedTasks = tasks.filter(
    (t) => t.status === 'planned' && t.archivedAt === undefined,
  );
  const selectedTask = plannedTasks.find((t) => t.id === taskId);
  const lastReward = rewards.find((r) => r.id === lastRewardId) ?? null;

  // 完了・削除などで選択肢から消えたタスク ID を保持し続けない
  useEffect(() => {
    if (taskId === '') return;
    const stillPlanned = tasks.some(
      (t) => t.id === taskId && t.status === 'planned' && t.archivedAt === undefined,
    );
    if (!stillPlanned) setTaskId('');
  }, [taskId, tasks]);

  const toggleCharacter = (id: string) => {
    setCharacterIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleFinish = (result: 'completed' | 'interrupted') => {
    // 確認なしで確定する（MVP の仮仕様。二重付与はストア側で防止）
    const rewardId = finishSession(result);
    setLastRewardId(rewardId);
  };

  if (activeSession === null) {
    const taskSelected = selectedTask !== undefined;
    return (
      <Card title="出撃（作業セッション開始）">
        {plannedTasks.length === 0 ? (
          <p className="list-item__meta">
            開始できるタスクがありません。下のフォームからタスクを作成してください。
          </p>
        ) : (
          <>
            <Field label="取り組むタスク" htmlFor="session-task">
              <SelectInput
                id="session-task"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
              >
                <option value="">選択してください</option>
                {plannedTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}（
                    {t.timerMode === 'stopwatch'
                      ? 'ストップウォッチ'
                      : `予定 ${t.estimatedMinutes} 分`}
                    ）
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="派遣先（戦闘先）" htmlFor="session-destination">
              <SelectInput
                id="session-destination"
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
            <Field label="派遣キャラクター" htmlFor="session-characters">
              <div className="checkbox-list" id="session-characters">
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
              disabled={!taskSelected || characterIds.length === 0}
              onClick={() => {
                if (selectedTask === undefined) return;
                startSession(selectedTask.id, destinationId, characterIds);
                setLastRewardId(null);
              }}
            >
              作業開始
            </Button>
            {lastReward !== null && (
              <div className="notice" style={{ marginTop: 16 }}>
                <strong>前回の報酬：</strong>通貨 +{lastReward.finalReward.currency} /
                経験値 +{lastReward.finalReward.experience}
                {Object.entries(lastReward.finalReward.materials).map(([id, qty]) => (
                  <span key={id}>
                    {' '}
                    / {MATERIAL_NAMES[id] ?? id} +{qty}
                  </span>
                ))}
                <br />
                <span className="list-item__meta">{lastReward.reason}</span>
              </div>
            )}
          </>
        )}
      </Card>
    );
  }

  const task = tasks.find((t) => t.id === activeSession.taskId);
  const destination = DESTINATIONS.find((d) => d.id === activeSession.destinationId);

  return (
    <Card title="作業中">
      <p className="list-item__title">{task?.title ?? '(削除されたタスク)'}</p>
      <p className="list-item__meta">
        派遣先：{destination?.name} / 開始：
        {new Date(activeSession.startedAt).toLocaleTimeString('ja-JP')}
      </p>
      <p>
        {activeSession.state === 'running' ? (
          <Badge tone="running">作業中</Badge>
        ) : (
          <Badge tone="paused">一時停止中</Badge>
        )}
      </p>
      <p className="timer-display" aria-live="polite">
        {formatElapsed(elapsed)}
      </p>
      <div className="btn-row">
        {activeSession.state === 'running' ? (
          <Button variant="secondary" onClick={pauseSession}>
            一時停止
          </Button>
        ) : (
          <Button onClick={resumeSession}>再開</Button>
        )}
        <Button onClick={() => handleFinish('completed')}>完了</Button>
        <Button variant="secondary" onClick={() => handleFinish('interrupted')}>
          中断して終了
        </Button>
        <Button variant="danger" onClick={cancelSession}>
          取り消し（記録なし）
        </Button>
      </div>
    </Card>
  );
}
