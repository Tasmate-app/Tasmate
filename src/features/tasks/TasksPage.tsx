import { TaskForm } from './TaskForm';
import { TaskList } from './TaskList';
import { TimerPanel } from './TimerPanel';

/** 出撃／タスク管理画面 */
export function TasksPage() {
  return (
    <div>
      <div className="notice notice--provisional">
        報酬ルール・数値はすべて仮実装です（AI 報酬は未接続）。タイマーは開始時刻を基準に計算され、
        ページを再読み込みしても作業状態が復元されます。
      </div>
      <div className="page-grid page-grid--two">
        <div className="page-grid">
          <TimerPanel />
          <TaskForm />
        </div>
        <div className="page-grid">
          <TaskList />
        </div>
      </div>
    </div>
  );
}
