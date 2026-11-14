import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatElapsed } from '../../domain/session';
import { useAppStore } from '../../stores/appStore';

/** 中断して保持しているクエストの一覧。再開・破棄を行う */
export function InterruptedQuestList() {
  const quests = useAppStore((s) => s.interruptedQuests);
  const tasks = useAppStore((s) => s.tasks);
  const activeSession = useAppStore((s) => s.activeSession);
  const resumeInterruptedQuest = useAppStore((s) => s.resumeInterruptedQuest);
  const discardInterruptedQuest = useAppStore((s) => s.discardInterruptedQuest);

  if (quests.length === 0) return null;

  const handleDiscard = (id: string, title: string) => {
    const ok = window.confirm(
      `「${title}」を破棄します。これまでの報酬は保持されますが、再開できなくなります。`,
    );
    if (ok) discardInterruptedQuest(id);
  };

  return (
    <Card title="中断中のクエスト">
      <ul className="list">
        {quests.map((quest) => {
          const task = tasks.find((t) => t.id === quest.taskId);
          const title = quest.taskTitleSnapshot ?? task?.title ?? '(削除されたタスク)';
          const stopwatch = quest.timerMode === 'stopwatch';
          const estimatedTotal = (task?.estimatedMinutes ?? 0) * 60;
          const remaining = Math.max(0, estimatedTotal - quest.elapsedSeconds);
          return (
            <li key={quest.id} className="list-item">
              <div className="list-item__title">{title}</div>
              <div className="list-item__meta">
                <Badge tone="paused">中断中</Badge> 作業済み {formatElapsed(quest.elapsedSeconds)}
                {stopwatch
                  ? ' / ストップウォッチ（予定時間なし）'
                  : ` / 残り ${formatElapsed(remaining)}`}
              </div>
              <div className="btn-row">
                <Button
                  disabled={activeSession !== null}
                  onClick={() => resumeInterruptedQuest(quest.id)}
                >
                  再開
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDiscard(quest.id, title)}
                >
                  破棄
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
