import { useState, type FormEvent } from 'react';
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
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, SelectInput, TextArea, TextInput } from '../../components/ui/Field';
import { useAppStore } from '../../stores/appStore';

interface CategoryMetadataFieldsProps {
  idPrefix: string;
  crystalType: CrystalType | '';
  keywords: string;
  onCrystalTypeChange: (value: CrystalType | '') => void;
  onKeywordsChange: (value: string) => void;
}

function CategoryMetadataFields({
  idPrefix,
  crystalType,
  keywords,
  onCrystalTypeChange,
  onKeywordsChange,
}: CategoryMetadataFieldsProps) {
  return (
    <>
      <Field label="既定の結晶タイプ" htmlFor={`${idPrefix}-crystal-type`}>
        <SelectInput
          id={`${idPrefix}-crystal-type`}
          value={crystalType}
          onChange={(event) => onCrystalTypeChange(event.target.value as CrystalType | '')}
        >
          <option value="">自動（カテゴリ名から推定）</option>
          {CRYSTAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {CRYSTAL_TYPE_LABELS[type]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="キーワード（任意）" htmlFor={`${idPrefix}-keywords`}>
        <TextArea
          id={`${idPrefix}-keywords`}
          value={keywords}
          onChange={(event) => onKeywordsChange(event.target.value)}
          placeholder="例：技術書、論文、単語"
          maxLength={400}
          aria-describedby={`${idPrefix}-keywords-help`}
        />
      </Field>
      <p className="list-item__meta" id={`${idPrefix}-keywords-help`}>
        カンマ・読点・改行区切りで入力します。タスク名や説明に含まれると、このカテゴリの既定タイプを優先します。
      </p>
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

interface CategoryCardProps {
  category: Category;
  categories: Category[];
  subCategories: SubCategory[];
}

function CategoryCard({ category, categories, subCategories }: CategoryCardProps) {
  const renameCategory = useAppStore((s) => s.renameCategory);
  const updateCategoryMetadata = useAppStore((s) => s.updateCategoryMetadata);
  const deleteCategory = useAppStore((s) => s.deleteCategory);
  const moveCategory = useAppStore((s) => s.moveCategory);
  const addSubCategory = useAppStore((s) => s.addSubCategory);
  const renameSubCategory = useAppStore((s) => s.renameSubCategory);
  const deleteSubCategory = useAppStore((s) => s.deleteSubCategory);
  const moveSubCategory = useAppStore((s) => s.moveSubCategory);

  const [editingCategory, setEditingCategory] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState(category.name);
  const [crystalDraft, setCrystalDraft] = useState<CrystalType | ''>(
    category.defaultCrystalType ?? '',
  );
  const [keywordsDraft, setKeywordsDraft] = useState(formatKeywordInput(category.keywords));
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subDraft, setSubDraft] = useState('');
  const [confirmDeleteSubId, setConfirmDeleteSubId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const orderedCategories = activeCategories(categories);
  const categoryIndex = orderedCategories.findIndex((item) => item.id === category.id);
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
    setMessage('カテゴリーを更新しました。');
  };

  const onAddSub = (event: FormEvent) => {
    event.preventDefault();
    const id = addSubCategory(category.id, newSubName);
    if (id === '') {
      setMessage('同じ名前のサブカテゴリーがあるか、名前が空です。');
      return;
    }
    setNewSubName('');
    setMessage('サブカテゴリーを追加しました。');
  };

  const saveSubName = (sub: SubCategory) => {
    if (subDraft.trim() === '') return;
    renameSubCategory(sub.id, subDraft);
    setEditingSubId(null);
    setMessage('サブカテゴリー名を変更しました。');
  };

  return (
    <section className="card category-card">
      <div className="category-card__head">
        {editingCategory ? (
          <div className="category-card__edit">
            <Field label="カテゴリー名" htmlFor={`category-name-${category.id}`}>
              <TextInput
                id={`category-name-${category.id}`}
                value={categoryDraft}
                onChange={(event) => setCategoryDraft(event.target.value)}
                maxLength={40}
              />
            </Field>
            <CategoryMetadataFields
              idPrefix={`category-edit-${category.id}`}
              crystalType={crystalDraft}
              keywords={keywordsDraft}
              onCrystalTypeChange={setCrystalDraft}
              onKeywordsChange={setKeywordsDraft}
            />
            <div className="category-actions">
              <button type="button" className="category-action" onClick={saveCategoryName}>
                保存
              </button>
              <button
                type="button"
                className="category-action"
                onClick={() => {
                  setEditingCategory(false);
                  setCategoryDraft(category.name);
                  setCrystalDraft(category.defaultCrystalType ?? '');
                  setKeywordsDraft(formatKeywordInput(category.keywords));
                }}
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2>{category.name}</h2>
            <div className="category-actions">
              <button
                type="button"
                className="category-action"
                aria-label={`${category.name}を上へ`}
                disabled={categoryIndex <= 0}
                onClick={() => moveCategory(category.id, 'up')}
              >
                ↑
              </button>
              <button
                type="button"
                className="category-action"
                aria-label={`${category.name}を下へ`}
                disabled={categoryIndex < 0 || categoryIndex >= orderedCategories.length - 1}
                onClick={() => moveCategory(category.id, 'down')}
              >
                ↓
              </button>
              <button
                type="button"
                className="category-action"
                onClick={() => {
                  setCategoryDraft(category.name);
                  setCrystalDraft(category.defaultCrystalType ?? '');
                  setKeywordsDraft(formatKeywordInput(category.keywords));
                  setEditingCategory(true);
                }}
              >
                編集
              </button>
              {confirmDeleteCategory ? (
                <>
                  <button
                    type="button"
                    className="category-action category-action--danger"
                    onClick={() => deleteCategory(category.id)}
                  >
                    削除する
                  </button>
                  <button
                    type="button"
                    className="category-action"
                    onClick={() => setConfirmDeleteCategory(false)}
                  >
                    取消
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="category-action category-action--danger"
                  onClick={() => setConfirmDeleteCategory(true)}
                >
                  削除
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {!editingCategory && (
        <div className="category-meta">
          <span>結晶タイプ：{categoryTypeLabel(category)}</span>
          <span>
            キーワード：
            {category.keywords !== undefined && category.keywords.length > 0
              ? category.keywords.join('、')
              : '未設定'}
          </span>
        </div>
      )}

      {confirmDeleteCategory && (
        <p className="list-item__meta">
          削除しても過去の作業履歴は残ります。新しいタスクの選択肢から外れます。
        </p>
      )}

      <ul className="category-subs">
        {subs.map((sub) => {
          const index = activeSubs.findIndex((item) => item.id === sub.id);
          const isArchived = sub.archivedAt !== undefined;
          return (
            <li key={sub.id} className={`category-sub${isArchived ? ' is-archived' : ''}`}>
              {editingSubId === sub.id ? (
                <div className="category-card__edit">
                  <TextInput
                    value={subDraft}
                    onChange={(event) => setSubDraft(event.target.value)}
                    maxLength={40}
                    aria-label="サブカテゴリー名"
                  />
                  <div className="category-actions">
                    <button
                      type="button"
                      className="category-action"
                      onClick={() => saveSubName(sub)}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="category-action"
                      onClick={() => setEditingSubId(null)}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="category-sub__name">
                    {sub.name}
                    {isArchived ? '（削除済み）' : ''}
                  </span>
                  {!isArchived && (
                    <div className="category-actions">
                      <button
                        type="button"
                        className="category-action"
                        aria-label={`${sub.name}を上へ`}
                        disabled={index <= 0}
                        onClick={() => moveSubCategory(sub.id, 'up')}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="category-action"
                        aria-label={`${sub.name}を下へ`}
                        disabled={index < 0 || index >= activeSubs.length - 1}
                        onClick={() => moveSubCategory(sub.id, 'down')}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="category-action"
                        onClick={() => {
                          setSubDraft(sub.name);
                          setEditingSubId(sub.id);
                        }}
                      >
                        名前変更
                      </button>
                      {confirmDeleteSubId === sub.id ? (
                        <>
                          <button
                            type="button"
                            className="category-action category-action--danger"
                            onClick={() => {
                              deleteSubCategory(sub.id);
                              setConfirmDeleteSubId(null);
                            }}
                          >
                            削除する
                          </button>
                          <button
                            type="button"
                            className="category-action"
                            onClick={() => setConfirmDeleteSubId(null)}
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="category-action category-action--danger"
                          onClick={() => setConfirmDeleteSubId(sub.id)}
                        >
                          削除
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
        {subs.length === 0 && (
          <li className="list-item__meta">サブカテゴリーはまだありません。</li>
        )}
      </ul>

      <form className="category-sub-form" onSubmit={onAddSub}>
        <Field label="サブカテゴリーを追加" htmlFor={`sub-add-${category.id}`}>
          <TextInput
            id={`sub-add-${category.id}`}
            value={newSubName}
            onChange={(event) => setNewSubName(event.target.value)}
            placeholder="例：数学"
            maxLength={40}
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={newSubName.trim() === ''}>
          追加
        </Button>
      </form>

      {message !== '' && (
        <p className="list-item__meta" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

/** カテゴリー／サブカテゴリーの管理画面 */
export function CategoriesPage() {
  const categories = useAppStore((s) => s.categories);
  const subCategories = useAppStore((s) => s.subCategories);
  const addCategory = useAppStore((s) => s.addCategory);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCrystalType, setNewCategoryCrystalType] = useState<CrystalType | ''>('');
  const [newCategoryKeywords, setNewCategoryKeywords] = useState('');
  const [message, setMessage] = useState('');

  const active = activeCategories(categories);
  const archived = categories.filter((category) => category.archivedAt !== undefined);

  const onAddCategory = (event: FormEvent) => {
    event.preventDefault();
    const id = addCategory(newCategoryName, {
      keywords: parseKeywordInput(newCategoryKeywords),
      defaultCrystalType:
        newCategoryCrystalType === '' ? undefined : newCategoryCrystalType,
    });
    if (id === '') {
      setMessage('同じ名前のカテゴリーがあるか、名前が空です。');
      return;
    }
    setNewCategoryName('');
    setNewCategoryCrystalType('');
    setNewCategoryKeywords('');
    setMessage('カテゴリーを追加しました。');
  };

  return (
    <div className="game-screen">
      <div className="game-container">
        <h1 className="game-screen__title">カテゴリー管理</h1>
        <p className="list-item__meta companion-lead">
          作業の分類を整理できます。削除しても過去の履歴は残ります。
        </p>

        <Card title="カテゴリーを追加">
          <form className="category-add-form" onSubmit={onAddCategory}>
            <Field label="カテゴリー名" htmlFor="new-category-name">
              <TextInput
                id="new-category-name"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="例：読書"
                maxLength={40}
              />
            </Field>
            <CategoryMetadataFields
              idPrefix="new-category"
              crystalType={newCategoryCrystalType}
              keywords={newCategoryKeywords}
              onCrystalTypeChange={setNewCategoryCrystalType}
              onKeywordsChange={setNewCategoryKeywords}
            />
            <Button type="submit" disabled={newCategoryName.trim() === ''}>
              カテゴリーを追加
            </Button>
          </form>
          {message !== '' && (
            <p className="list-item__meta" role="status">
              {message}
            </p>
          )}
        </Card>

        <div className="category-list">
          {active.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              categories={categories}
              subCategories={subCategories}
            />
          ))}
        </div>

        {active.length === 0 && (
          <p className="list-item__meta">
            有効なカテゴリーがありません。上のフォームから追加してください。
          </p>
        )}

        {archived.length > 0 && (
          <Card title="削除済みカテゴリー">
            <p className="list-item__meta">
              削除済みのカテゴリーは履歴に残りますが、新しいタスクでは選べません。
            </p>
            <ul className="list">
              {archived.map((category) => (
                <li key={category.id} className="list-item">
                  <div className="list-item__title">{category.name}</div>
                  <div className="list-item__meta">
                    サブカテゴリー：
                    {sortSubCategories(
                      subCategories.filter((sub) => sub.categoryId === category.id),
                    )
                      .map((sub) => sub.name)
                      .join('、') || 'なし'}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
