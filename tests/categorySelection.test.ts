import { describe, expect, it } from 'vitest';
import type { Category } from '@tasmate/types';
import { createDefaultCategorySelection } from '../src/features/taxonomy/categorySelection';

function category(id: string, order: number, archivedAt?: string): Category {
  return {
    id,
    name: id,
    order,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    archivedAt,
  };
}

describe('createDefaultCategorySelection', () => {
  it('並び順の先頭にある有効カテゴリーを選択する', () => {
    const selection = createDefaultCategorySelection([
      category('second', 1),
      category('first', 0),
    ]);

    expect(selection).toEqual({ categoryId: 'first', subCategoryId: '' });
  });

  it('削除済みカテゴリーは選択しない', () => {
    const selection = createDefaultCategorySelection([
      category('archived', 0, '2026-01-02T00:00:00.000Z'),
      category('active', 1),
    ]);

    expect(selection.categoryId).toBe('active');
  });

  it('有効なカテゴリーが無ければ空文字を返す', () => {
    expect(createDefaultCategorySelection([])).toEqual({
      categoryId: '',
      subCategoryId: '',
    });
    expect(
      createDefaultCategorySelection([category('archived', 0, '2026-01-02T00:00:00.000Z')]),
    ).toEqual({ categoryId: '', subCategoryId: '' });
  });
});
