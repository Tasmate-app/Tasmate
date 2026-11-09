import type { SessionResult } from './index';

/** 履歴グラフの集計単位 */
export type HistoryGranularity = 'day' | 'week' | 'month' | 'year';

/** 今日・今週・今月・累計の実作業時間（秒） */
export interface WorkTimeTotals {
  today: number;
  week: number;
  month: number;
  total: number;
}

/** 推移グラフの1点 */
export interface TimeSeriesPoint {
  key: string;
  label: string;
  seconds: number;
}

/** カテゴリー別の実作業時間 */
export interface CategoryTimeTotal {
  categoryId: string | null;
  categoryName: string;
  seconds: number;
  /** 全体に占める割合（0〜1） */
  ratio: number;
  /** 削除済みカテゴリーか */
  archived: boolean;
}

/** サブカテゴリー別の実作業時間 */
export interface SubCategoryTimeTotal {
  subCategoryId: string | null;
  subCategoryName: string;
  seconds: number;
  ratio: number;
  archived: boolean;
}

/** 作業履歴の1件（作業セッション単位） */
export interface HistoryEntry {
  sessionId: string;
  taskId: string;
  taskTitle: string;
  /** セッション開始時刻（ISO 8601） */
  startedAt: string;
  endedAt: string | null;
  /** ローカル日付キー YYYY-MM-DD */
  dateKey: string;
  categoryId: string | null;
  categoryName: string;
  categoryArchived: boolean;
  subCategoryId: string | null;
  /** 未設定の場合は null（表示時に「未分類」とする） */
  subCategoryName: string | null;
  subCategoryArchived: boolean;
  /** 一時停止・休憩を除いた実作業秒数 */
  durationSeconds: number;
  result: SessionResult | null;
  completed: boolean;
}

/** 履歴一覧の絞り込み条件 */
export interface HistoryFilter {
  /** この日を含む（YYYY-MM-DD） */
  fromDateKey?: string;
  /** この日を含む（YYYY-MM-DD） */
  toDateKey?: string;
  categoryId?: string;
  /** null は未分類のみを指す */
  subCategoryId?: string | null;
}
