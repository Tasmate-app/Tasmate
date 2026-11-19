/**
 * カテゴリー／サブカテゴリーの型定義。
 * 予定・タスクは名称のスナップショットに加えて ID を保持し、
 * 名称変更・削除後も履歴表示を壊さないようにする。
 */

import type { CrystalType } from './inventory';

/** ユーザーが管理するカテゴリー */
export interface Category {
  id: string;
  name: string;
  /** 表示順（小さいほど先頭） */
  order: number;
  createdAt: string;
  updatedAt: string;
  /** 論理削除日時。履歴表示には残すが、新規選択肢からは除外する */
  archivedAt?: string;
  /** タスク内容に含まれると優先的に判定へ使うユーザー定義キーワード */
  keywords?: string[];
  /** キーワード一致時に付与する結晶タイプ。未設定時はカテゴリ名から推定する */
  defaultCrystalType?: CrystalType;
}

/** カテゴリーに属するサブカテゴリー */
export interface SubCategory {
  id: string;
  /** 親カテゴリー ID。同一名称でもカテゴリーが異なれば別物として扱う */
  categoryId: string;
  name: string;
  /** 親カテゴリー内での表示順 */
  order: number;
  createdAt: string;
  updatedAt: string;
  /** 論理削除日時。履歴表示には残すが、新規選択肢からは除外する */
  archivedAt?: string;
}
