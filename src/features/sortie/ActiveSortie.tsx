import { useMemo } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { MATERIAL_NAMES } from '../../domain/constants';
import { formatElapsed } from '../../domain/session';
import { useNow } from '../../hooks/useNow';
import { CHARACTER_DEFINITIONS, DESTINATIONS } from '../../data/seed';
import { sessionElapsedSeconds, useAppStore } from '../../stores/appStore';

interface ActiveSortieProps {
  onFinished: (rewardId: string | null) => void;
}

/** 作業中（タイマー・現在のクエスト・探索の進行状況を明確に表示） */
export function ActiveSortie({ onFinished }: ActiveSortieProps) {
  const activeSession = useAppStore((s) => s.activeSession);
  const tasks = useAppStore((s) => s.tasks);
  const facilities = useAppStore((s) => s.facilities);
  const pauseSession = useAppStore((s) => s.pauseSession);
  const resumeSession = useAppStore((s) => s.resumeSession);
  const finishSession = useAppStore((s) => s.finishSession);
  const cancelSession = useAppStore((s) => s.cancelSession);

  const now = useNow(500, activeSession !== null && activeSession.state === 'running');
  const elapsed = useMemo(
    () => sessionElapsedSeconds(activeSession, now),
    [activeSession, now],
  );

  if (activeSession === null) return null;

  const task = tasks.find((t) => t.id === activeSession.taskId);
  const destination = DESTINATIONS.find((d) => d.id === activeSession.destinationId);
  const estimatedTotal = (task?.estimatedMinutes ?? 25) * 60;
  const progress = estimatedTotal > 0 ? Math.min(1, elapsed / estimatedTotal) : 0;
  const runningFacilities = facilities.filter((f) => f.enabled);
  const dispatchedNames = activeSession.assignedCharacterIds.map(
    (id) => CHARACTER_DEFINITIONS.find((d) => d.id === id)?.name ?? id,
  );

  const handleFinish = (result: 'completed' | 'interrupted') => {
    const rewardId = finishSession(result);
    onFinished(rewardId);
  };

  return (
    <div className="sortie-grid">
      <Card title="作業中">
        <p className="list-item__title">{task?.title ?? '(削除されたタスク)'}</p>
        <p className="list-item__meta">
          派遣先：{destination?.name} / 開始：
          {new Date(activeSession.startedAt).toLocaleTimeString('ja-JP')}
        </p>
        <p>
          {activeSession.state === 'running' ? (
            <Badge tone="running">
              <span className="pulse-dot" aria-hidden="true" /> 作業中
            </Badge>
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

      <Card title="探索の進行状況">
        <p className="list-item__meta">
          {destination?.name} — {destination?.description}
        </p>
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label="予定時間に対する進行状況"
        >
          <div className="progress__bar" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="list-item__meta">
          予定 {task?.estimatedMinutes ?? 25} 分 に対して {Math.floor(elapsed / 60)} 分経過（
          {Math.round(progress * 100)}%）
        </p>
        <p className="list-item__meta">派遣中：{dispatchedNames.join('、')}</p>
        <p className="list-item__meta">
          稼働中の施設：{runningFacilities.length} 件
          {runningFacilities.length > 0 && '（作業中に生産が進行）'}
        </p>
        {destination !== undefined && (
          <p className="list-item__meta">
            入手可能素材：
            {Object.entries(destination.availableMaterials).map(([id, ratio]) => (
              <span key={id}>
                {' '}
                {MATERIAL_NAMES[id] ?? id}（{(Number(ratio) * 100).toFixed(0)}%）
              </span>
            ))}
          </p>
        )}
      </Card>
    </div>
  );
}
