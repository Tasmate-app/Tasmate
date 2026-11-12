import { activeCategories } from '@tasmate/core';
import type { Category } from '@tasmate/types';

export interface CategorySelection {
  categoryId: string;
  subCategoryId: string;
}

/**
 * 新規入力時のカテゴリー初期値。
 * select の表示と内部状態を一致させ、先頭カテゴリーのサブカテゴリーを
 * そのまま選択できるようにする。
 */
export function createDefaultCategorySelection(
  categories: readonly Category[],
): CategorySelection {
  return {
    categoryId: activeCategories(categories)[0]?.id ?? '',
    subCategoryId: '',
  };
}
