import type { Task, TaskStatus } from '@tasmate/types';
import { colors } from '../theme/tokens';

export const CATEGORY_OPTIONS = ['勉強', '作業', '運動', '家事', 'その他'] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  勉強: '#0891b2',
  作業: '#4f46e5',
  運動: '#0f9f6e',
  家事: '#f59e0b',
  その他: '#8b5cf6',
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? colors.textSubtle;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  planned: '予定',
  active: '進行中',
  completed: '完了',
  cancelled: '取消',
};

export function taskTimeLabel(task: Task): string {
  if (task.startTime !== undefined && task.endTime !== undefined) {
    return `${task.startTime} - ${task.endTime}`;
  }
  return '時間未設定';
}

export function taskScheduleLabel(task: Task): string {
  if (task.scheduledDate !== undefined) {
    return task.scheduledDate.replaceAll('-', '/');
  }
  return '日付未設定';
}
