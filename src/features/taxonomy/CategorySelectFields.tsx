import { activeCategories, activeSubCategories, findCategoryById } from '@tasmate/core';
import { Field, SelectInput } from '../../components/ui/Field';
import { useAppStore } from '../../stores/appStore';

export interface CategorySelection {
  categoryId: string;
  subCategoryId: string;
}

interface CategorySelectFieldsProps {
  idPrefix: string;
  value: CategorySelection;
  onChange: (next: CategorySelection) => void;
}

/**
 * カテゴリーとサブカテゴリーの選択欄。
 * 編集中の項目が削除済みでも現在値を選択肢に残し、意図せず変更されないようにする。
 */
export function CategorySelectFields({
  idPrefix,
  value,
  onChange,
}: CategorySelectFieldsProps) {
  const categories = useAppStore((s) => s.categories);
  const subCategories = useAppStore((s) => s.subCategories);

  const active = activeCategories(categories);
  const currentCategory = findCategoryById(categories, value.categoryId);
  const categoryOptions =
    currentCategory !== undefined &&
    currentCategory.archivedAt !== undefined &&
    !active.some((category) => category.id === currentCategory.id)
      ? [...active, currentCategory]
      : active;

  const categorySubs = activeSubCategories(subCategories, value.categoryId);
  const currentSub = subCategories.find((sub) => sub.id === value.subCategoryId);
  const subOptions =
    currentSub !== undefined &&
    currentSub.categoryId === value.categoryId &&
    currentSub.archivedAt !== undefined &&
    !categorySubs.some((sub) => sub.id === currentSub.id)
      ? [...categorySubs, currentSub]
      : categorySubs;

  return (
    <div className="field-row field-row--two">
      <Field label="カテゴリー" htmlFor={`${idPrefix}-category`}>
        <SelectInput
          id={`${idPrefix}-category`}
          value={value.categoryId}
          onChange={(event) =>
            onChange({ categoryId: event.target.value, subCategoryId: '' })
          }
        >
          {categoryOptions.length === 0 && <option value="">カテゴリーなし</option>}
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.archivedAt !== undefined ? '（削除済み）' : ''}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="サブカテゴリー（任意）" htmlFor={`${idPrefix}-subcategory`}>
        <SelectInput
          id={`${idPrefix}-subcategory`}
          value={value.subCategoryId}
          onChange={(event) =>
            onChange({ categoryId: value.categoryId, subCategoryId: event.target.value })
          }
          disabled={value.categoryId === ''}
        >
          <option value="">未分類</option>
          {subOptions.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
              {sub.archivedAt !== undefined ? '（削除済み）' : ''}
            </option>
          ))}
        </SelectInput>
      </Field>
    </div>
  );
}
