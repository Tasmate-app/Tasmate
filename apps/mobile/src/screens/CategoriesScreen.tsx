import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Category, CrystalType, SubCategory } from '@tasmate/types';
import {
  activeCategories,
  activeSubCategories,
  CRYSTAL_TYPE_LABELS,
  CRYSTAL_TYPES,
  formatKeywordInput,
  inferCategoryCrystalType,
  parseKeywordInput,
  sortSubCategories,
} from '@tasmate/core';
import { useMobileAppStore } from '../stores/appStore';
import {
  ChipGroup,
  GameButton,
  GameTextInput,
  FormField,
  Panel,
  ScreenBackground,
  ScreenHeader,
  screenContent,
} from '../ui';
import { colors, fontSize, radius, spacing } from '../theme/tokens';

interface CategoryMetadataFieldsProps {
  crystalType: CrystalType | '';
  keywords: string;
  onCrystalTypeChange: (value: CrystalType | '') => void;
  onKeywordsChange: (value: string) => void;
}

function CategoryMetadataFields({
  crystalType,
  keywords,
  onCrystalTypeChange,
  onKeywordsChange,
}: CategoryMetadataFieldsProps) {
  return (
    <>
      <FormField label="既定の結晶タイプ">
        <ChipGroup
          options={[
            { value: '', label: '自動' },
            ...CRYSTAL_TYPES.map((type) => ({
              value: type,
              label: CRYSTAL_TYPE_LABELS[type],
            })),
          ]}
          selected={[crystalType]}
          onToggle={(value) => onCrystalTypeChange(value as CrystalType | '')}
          accessibilityLabel="既定の結晶タイプ"
        />
      </FormField>
      <FormField
        label="キーワード（任意）"
        hint="カンマ・読点・改行区切り。タスク名や説明に含まれると、このカテゴリの既定タイプを優先します。"
      >
        <GameTextInput
          value={keywords}
          onChangeText={onKeywordsChange}
          placeholder="例：技術書、論文、単語"
          maxLength={400}
          multiline
        />
      </FormField>
    </>
  );
}

function categoryTypeLabel(category: Category): string {
  if (category.defaultCrystalType !== undefined) {
    return CRYSTAL_TYPE_LABELS[category.defaultCrystalType];
  }
  const inferred = inferCategoryCrystalType(category.name);
  return inferred === undefined
    ? '自動（知識の結晶）'
    : `自動（${CRYSTAL_TYPE_LABELS[inferred]}）`;
}

interface CategoryPanelProps {
  category: Category;
  categories: Category[];
  subCategories: SubCategory[];
}

function CategoryPanel({ category, categories, subCategories }: CategoryPanelProps) {
  const renameCategory = useMobileAppStore((s) => s.renameCategory);
  const updateCategoryMetadata = useMobileAppStore((s) => s.updateCategoryMetadata);
  const deleteCategory = useMobileAppStore((s) => s.deleteCategory);
  const moveCategory = useMobileAppStore((s) => s.moveCategory);
  const addSubCategory = useMobileAppStore((s) => s.addSubCategory);
  const renameSubCategory = useMobileAppStore((s) => s.renameSubCategory);
  const deleteSubCategory = useMobileAppStore((s) => s.deleteSubCategory);
  const moveSubCategory = useMobileAppStore((s) => s.moveSubCategory);

  const [editingCategory, setEditingCategory] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState(category.name);
  const [crystalDraft, setCrystalDraft] = useState<CrystalType | ''>(
    category.defaultCrystalType ?? '',
  );
  const [keywordsDraft, setKeywordsDraft] = useState(formatKeywordInput(category.keywords));
  const [newSubName, setNewSubName] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subDraft, setSubDraft] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const ordered = activeCategories(categories);
  const categoryIndex = ordered.findIndex((item) => item.id === category.id);
  const subs = sortSubCategories(
    subCategories.filter((sub) => sub.categoryId === category.id),
  );
  const activeSubs = activeSubCategories(subCategories, category.id);

  const saveCategoryName = () => {
    if (categoryDraft.trim() === '') return;
    renameCategory(category.id, categoryDraft);
    updateCategoryMetadata(category.id, {
      keywords: parseKeywordInput(keywordsDraft),
      defaultCrystalType: crystalDraft === '' ? undefined : crystalDraft,
    });
    setEditingCategory(false);
    setFeedback('カテゴリーを更新しました。');
  };

  const handleAddSub = () => {
    const id = addSubCategory(category.id, newSubName);
    if (id === '') {
      setFeedback('同じ名前のサブカテゴリーがあるか、名前が空です。');
      return;
    }
    setNewSubName('');
    setFeedback('サブカテゴリーを追加しました。');
  };

  const saveSubName = (sub: SubCategory) => {
    if (subDraft.trim() === '') return;
    renameSubCategory(sub.id, subDraft);
    setEditingSubId(null);
    setFeedback('サブカテゴリー名を変更しました。');
  };

  const confirmDeleteCategory = () => {
    Alert.alert(
      'カテゴリーを削除',
      '削除しても過去の作業履歴は残ります。新しい予定の選択肢から外れます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => deleteCategory(category.id),
        },
      ],
    );
  };

  const confirmDeleteSub = (sub: SubCategory) => {
    Alert.alert('サブカテゴリーを削除', `「${sub.name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => deleteSubCategory(sub.id),
      },
    ]);
  };

  return (
    <Panel
      title={category.name}
      eyebrow="CATEGORY"
      right={
        <View style={styles.headerActions}>
          <GameButton
            label="↑"
            size="sm"
            variant="ghost"
            disabled={categoryIndex <= 0}
            onPress={() => moveCategory(category.id, 'up')}
            accessibilityLabel={`${category.name}を上へ`}
          />
          <GameButton
            label="↓"
            size="sm"
            variant="ghost"
            disabled={categoryIndex < 0 || categoryIndex >= ordered.length - 1}
            onPress={() => moveCategory(category.id, 'down')}
            accessibilityLabel={`${category.name}を下へ`}
          />
        </View>
      }
    >
      {editingCategory ? (
        <View style={styles.editBlock}>
          <FormField label="カテゴリー名">
            <GameTextInput
              value={categoryDraft}
              onChangeText={setCategoryDraft}
              maxLength={40}
            />
          </FormField>
          <CategoryMetadataFields
            crystalType={crystalDraft}
            keywords={keywordsDraft}
            onCrystalTypeChange={setCrystalDraft}
            onKeywordsChange={setKeywordsDraft}
          />
          <View style={styles.row}>
            <GameButton label="保存" size="sm" onPress={saveCategoryName} />
            <GameButton
              label="取消"
              size="sm"
              variant="secondary"
              onPress={() => {
                setEditingCategory(false);
                setCategoryDraft(category.name);
                setCrystalDraft(category.defaultCrystalType ?? '');
                setKeywordsDraft(formatKeywordInput(category.keywords));
              }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          <GameButton
            label="編集"
            size="sm"
            variant="secondary"
            onPress={() => {
              setCategoryDraft(category.name);
              setCrystalDraft(category.defaultCrystalType ?? '');
              setKeywordsDraft(formatKeywordInput(category.keywords));
              setEditingCategory(true);
            }}
          />
          <GameButton
            label="削除"
            size="sm"
            variant="danger"
            onPress={confirmDeleteCategory}
          />
        </View>
      )}

      {!editingCategory && (
        <View style={styles.metaBlock}>
          <Text style={styles.metaText}>結晶タイプ：{categoryTypeLabel(category)}</Text>
          <Text style={styles.metaText}>
            キーワード：
            {category.keywords !== undefined && category.keywords.length > 0
              ? category.keywords.join('、')
              : '未設定'}
          </Text>
        </View>
      )}

      <View style={styles.subList}>
        {subs.map((sub) => {
          const index = activeSubs.findIndex((item) => item.id === sub.id);
          const isArchived = sub.archivedAt !== undefined;
          return (
            <View key={sub.id} style={styles.subRow}>
              {editingSubId === sub.id ? (
                <View style={styles.editBlock}>
                  <GameTextInput
                    value={subDraft}
                    onChangeText={setSubDraft}
                    maxLength={40}
                  />
                  <View style={styles.row}>
                    <GameButton label="保存" size="sm" onPress={() => saveSubName(sub)} />
                    <GameButton
                      label="取消"
                      size="sm"
                      variant="secondary"
                      onPress={() => setEditingSubId(null)}
                    />
                  </View>
                </View>
              ) : (
                <>
                  <Text style={[styles.subName, isArchived ? styles.archivedText : null]}>
                    {sub.name}
                    {isArchived ? '（削除済み）' : ''}
                  </Text>
                  {!isArchived && (
                    <View style={styles.subActions}>
                      <GameButton
                        label="↑"
                        size="sm"
                        variant="ghost"
                        disabled={index <= 0}
                        onPress={() => moveSubCategory(sub.id, 'up')}
                        accessibilityLabel={`${sub.name}を上へ`}
                      />
                      <GameButton
                        label="↓"
                        size="sm"
                        variant="ghost"
                        disabled={index < 0 || index >= activeSubs.length - 1}
                        onPress={() => moveSubCategory(sub.id, 'down')}
                        accessibilityLabel={`${sub.name}を下へ`}
                      />
                      <GameButton
                        label="編集"
                        size="sm"
                        variant="ghost"
                        onPress={() => {
                          setSubDraft(sub.name);
                          setEditingSubId(sub.id);
                        }}
                      />
                      <GameButton
                        label="削除"
                        size="sm"
                        variant="ghost"
                        onPress={() => confirmDeleteSub(sub)}
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          );
        })}
        {subs.length === 0 && (
          <Text style={styles.note}>サブカテゴリーはまだありません。</Text>
        )}
      </View>

      <FormField label="サブカテゴリーを追加">
        <GameTextInput
          value={newSubName}
          onChangeText={setNewSubName}
          placeholder="例：数学"
          maxLength={40}
        />
      </FormField>
      <GameButton
        label="サブカテゴリーを追加"
        size="sm"
        variant="secondary"
        disabled={newSubName.trim() === ''}
        onPress={handleAddSub}
      />
      {feedback !== null && <Text style={styles.note}>{feedback}</Text>}
    </Panel>
  );
}

export function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const categories = useMobileAppStore((s) => s.categories);
  const subCategories = useMobileAppStore((s) => s.subCategories);
  const addCategory = useMobileAppStore((s) => s.addCategory);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCrystalType, setNewCategoryCrystalType] = useState<CrystalType | ''>('');
  const [newCategoryKeywords, setNewCategoryKeywords] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const active = activeCategories(categories);
  const archived = categories.filter((category) => category.archivedAt !== undefined);

  const handleAdd = () => {
    const id = addCategory(newCategoryName, {
      keywords: parseKeywordInput(newCategoryKeywords),
      defaultCrystalType:
        newCategoryCrystalType === '' ? undefined : newCategoryCrystalType,
    });
    if (id === '') {
      setFeedback('同じ名前のカテゴリーがあるか、名前が空です。');
      return;
    }
    setNewCategoryName('');
    setNewCategoryCrystalType('');
    setNewCategoryKeywords('');
    setFeedback('カテゴリーを追加しました。');
  };

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.md + insets.top,
            paddingBottom: spacing.xxl + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          eyebrow="CATEGORY / TAXONOMY"
          title="カテゴリー管理"
          subtitle="作業の分類を整理できます。削除しても過去の履歴は残ります。"
          right={
            <GameButton
              label="戻る"
              size="sm"
              variant="secondary"
              onPress={() => router.back()}
            />
          }
        />

        <Panel title="カテゴリーを追加" eyebrow="NEW CATEGORY" tone="primary">
          <FormField label="カテゴリー名">
            <GameTextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="例：読書"
              maxLength={40}
            />
          </FormField>
          <CategoryMetadataFields
            crystalType={newCategoryCrystalType}
            keywords={newCategoryKeywords}
            onCrystalTypeChange={setNewCategoryCrystalType}
            onKeywordsChange={setNewCategoryKeywords}
          />
          <GameButton
            label="カテゴリーを追加"
            disabled={newCategoryName.trim() === ''}
            onPress={handleAdd}
          />
          {feedback !== null && <Text style={styles.note}>{feedback}</Text>}
        </Panel>

        {active.map((category) => (
          <CategoryPanel
            key={category.id}
            category={category}
            categories={categories}
            subCategories={subCategories}
          />
        ))}

        {active.length === 0 && (
          <Text style={styles.note}>
            有効なカテゴリーがありません。上のフォームから追加してください。
          </Text>
        )}

        {archived.length > 0 && (
          <Panel title="削除済みカテゴリー" eyebrow="ARCHIVED" tone="secondary">
            <Text style={styles.note}>
              削除済みのカテゴリーは履歴に残りますが、新しい予定では選べません。
            </Text>
            {archived.map((category) => (
              <View key={category.id} style={styles.archivedRow}>
                <Text style={styles.subName}>{category.name}</Text>
                <Text style={styles.note}>
                  サブカテゴリー：
                  {sortSubCategories(
                    subCategories.filter((sub) => sub.categoryId === category.id),
                  )
                    .map((sub) => sub.name)
                    .join('、') || 'なし'}
                </Text>
              </View>
            ))}
          </Panel>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    ...screenContent,
    paddingTop: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  editBlock: {
    gap: spacing.xs,
    flex: 1,
  },
  metaBlock: {
    gap: 2,
    marginTop: spacing.xs,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
    lineHeight: 17,
  },
  subList: {
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    flexWrap: 'wrap',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  subName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
    flexShrink: 1,
  },
  subActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  archivedText: {
    color: colors.textMuted,
  },
  archivedRow: {
    gap: 1,
    paddingVertical: 4,
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
});
