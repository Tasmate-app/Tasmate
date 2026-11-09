import { Text, StyleSheet } from 'react-native';
import { activeCategories, activeSubCategories, findCategoryById } from '@tasmate/core';
import { useMobileAppStore } from '../../stores/appStore';
import { ChipGroup, FormField } from '../../ui';
import { colors, fontSize } from '../../theme/tokens';
import { categoryColor } from '../../lib/taskMeta';

export interface CategorySelection {
  categoryId: string;
  subCategoryId: string;
}

interface CategoryPickerProps {
  value: CategorySelection;
  onChange: (next: CategorySelection) => void;
}

/**
 * カテゴリー／サブカテゴリーの選択。
 * 削除済みの現在値は選択肢に残し、既存予定の分類が勝手に変わらないようにする。
 */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const categories = useMobileAppStore((s) => s.categories);
  const subCategories = useMobileAppStore((s) => s.subCategories);

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

  if (categoryOptions.length === 0) {
    return (
      <FormField label="カテゴリー">
        <Text style={styles.empty}>カテゴリーがありません。分類画面から追加してください。</Text>
      </FormField>
    );
  }

  return (
    <>
      <FormField label="カテゴリー">
        <ChipGroup
          options={categoryOptions.map((category) => ({
            value: category.id,
            label: `${category.name}${category.archivedAt !== undefined ? '（削除済み）' : ''}`,
            color: categoryColor(category.name),
          }))}
          selected={value.categoryId === '' ? [] : [value.categoryId]}
          onToggle={(categoryId) => onChange({ categoryId, subCategoryId: '' })}
          accessibilityLabel="カテゴリー"
        />
      </FormField>
      <FormField label="サブカテゴリー（任意）">
        <ChipGroup
          options={[
            { value: '', label: '未分類' },
            ...subOptions.map((sub) => ({
              value: sub.id,
              label: `${sub.name}${sub.archivedAt !== undefined ? '（削除済み）' : ''}`,
            })),
          ]}
          selected={[value.subCategoryId]}
          onToggle={(subCategoryId) =>
            onChange({ categoryId: value.categoryId, subCategoryId })
          }
          accessibilityLabel="サブカテゴリー"
        />
      </FormField>
    </>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
});
