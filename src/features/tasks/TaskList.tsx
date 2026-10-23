import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAppStore } from '../../stores/appStore';

/** タスク一覧 */
export function TaskList() {
  const tasks = useAppStore((s) => s.tasks);
  const activeSession = useAppStore((s) => s.activeSession);
  const deleteTask = useAppStore((s) => s.deleteTask);

  if (tasks.length === 0) {
    return (
      <Card title="タスク一覧">
        <p className="list-item__meta">タスクはまだありません。上のフォームから作成してください。</p>
      </Card>
    );
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '進行中';
      case 'completed':
        return '完了済み';
      case 'cancelled':
        return '取消';
      default:
        return '予定';
    }
  };

  return (
    <Card title="タスク一覧">
      <ul className="list">
        {tasks.map((t) => (
          <li key={t.id} className="list-item">
            <div className="list-item__title">{t.title}</div>
            <div className="list-item__meta">
              <Badge tone={t.status === 'active' ? 'running' : undefined}>
                {statusLabel(t.status)}
              </Badge>{' '}
              {t.category}
              {t.subject !== undefined && t.subject !== '' ? ` / ${t.subject}` : ''} / 予定{' '}
              {t.estimatedMinutes} 分
            </div>
            {t.description !== '' && <div className="list-item__meta">{t.description}</div>}
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
        ))}
      </ul>
    </Card>
  );
}
