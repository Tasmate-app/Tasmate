import { useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toDateKey } from '../../domain/weekly';
import { useAppStore } from '../../stores/appStore';

/** 直近に取り組む予定を1件だけ示し、クエストボードへ導く */
export function NextQuest() {
  const tasks = useAppStore((s) => s.tasks);
  const todayKey = toDateKey(new Date());

  const nextTask = useMemo(() => {
    const candidates = tasks
      .filter((task) => task.status === 'planned' && task.archivedAt === undefined)
      .sort((a, b) => {
        const dateA = a.scheduledDate ?? '9999-99-99';
        const dateB = b.scheduledDate ?? '9999-99-99';
        if (dateA !== dateB) return dateA < dateB ? -1 : 1;
        return (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99');
      });
    return candidates[0] ?? null;
  }, [tasks]);

  if (nextTask === null) return null;

  const dateLabel =
    nextTask.scheduledDate === undefined
      ? '予定日なし'
      : nextTask.scheduledDate === todayKey
        ? '今日'
        : `${Number(nextTask.scheduledDate.slice(5, 7))}月${Number(
            nextTask.scheduledDate.slice(8, 10),
          )}日`;

  const scrollToBoard = () => {
    document.getElementById('quest-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="next-quest" aria-label="次のクエスト">
      <div className="next-quest__body">
        <p className="next-quest__label">
          <Badge>次のクエスト</Badge>
          <span>
            {dateLabel}
            {nextTask.startTime !== undefined && ` ${nextTask.startTime}`}
          </span>
        </p>
        <h2>{nextTask.title}</h2>
        <p className="list-item__meta">
          {nextTask.category}
          {nextTask.subCategoryName !== undefined && ` / ${nextTask.subCategoryName}`} ／{' '}
          {nextTask.timerMode === 'stopwatch'
            ? 'ストップウォッチ'
            : `予定 ${nextTask.estimatedMinutes} 分`}
        </p>
      </div>
      <Button variant="secondary" onClick={scrollToBoard}>
        クエストボードへ
      </Button>
    </section>
  );
}
