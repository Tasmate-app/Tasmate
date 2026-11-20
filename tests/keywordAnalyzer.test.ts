import { describe, expect, it } from 'vitest';
import type { TaskEvaluationInput } from '@tasmate/types';
import {
  analyzeTaskByKeywords,
  inferCategoryCrystalType,
} from '@tasmate/task-evaluation';

function input(overrides: Partial<TaskEvaluationInput> = {}): TaskEvaluationInput {
  return {
    taskId: 'task-keyword',
    title: 'タスク',
    description: '',
    category: 'その他',
    estimatedMinutes: 25,
    actualMinutes: 25,
    ...overrides,
  };
}

describe('キーワードによる結晶判定', () => {
  it('一致した組み込みキーワードの数を優先する', () => {
    const result = analyzeTaskByKeywords(
      input({ title: '数学のレポート作成', description: '応用問題を解いてまとめる' }),
    );
    expect(result.materialType).toBe('creation_crystal');
    expect(result.source).toBe('keyword');
  });

  it('カテゴリのユーザーキーワードを組み込み判定より優先する', () => {
    const result = analyzeTaskByKeywords(
      input({
        title: '設計レビュー',
        category: '読書',
        categoryKeywords: ['設計'],
        categoryDefaultType: 'knowledge_crystal',
      }),
    );
    expect(result.materialType).toBe('knowledge_crystal');
    expect(result.reason).toContain('設計');
  });

  it('組み込みキーワードはカテゴリ既定タイプより優先する', () => {
    const result = analyzeTaskByKeywords(
      input({
        title: '資料をまとめる',
        category: '読書',
        categoryDefaultType: 'knowledge_crystal',
      }),
    );
    expect(result.materialType).toBe('creation_crystal');
  });

  it('組み込みキーワードに一致しない場合はカテゴリの既定タイプを使う', () => {
    const result = analyzeTaskByKeywords(
      input({
        title: '気になったことを整理する',
        category: '読書',
        categoryDefaultType: 'knowledge_crystal',
      }),
    );
    expect(result.materialType).toBe('knowledge_crystal');
    expect(result.reason).toContain('既定タイプ');
  });

  it('カテゴリ名から既定タイプを推定する', () => {
    expect(inferCategoryCrystalType('読書')).toBe('knowledge_crystal');
    expect(inferCategoryCrystalType('数学')).toBe('thought_crystal');
    expect(inferCategoryCrystalType('研究')).toBe('exploration_crystal');
    expect(inferCategoryCrystalType('未知の分類')).toBeUndefined();
  });

  it('難易度は実作業時間と見積もり時間の長い方で決まる', () => {
    expect(analyzeTaskByKeywords(input({ estimatedMinutes: 10, actualMinutes: 45 })).difficulty).toBe(3);
    expect(analyzeTaskByKeywords(input({ estimatedMinutes: 10, actualMinutes: 10 })).difficulty).toBe(1);
  });
});
