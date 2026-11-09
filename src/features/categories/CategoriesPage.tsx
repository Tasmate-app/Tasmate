import { useState, type FormEvent } from 'react';
import type { Category, SubCategory } from '@tasmate/types';
import {
  activeCategories,
  activeSubCategories,
  sortSubCategories,
} from '@tasmate/core';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, TextInput } from '../../components/ui/Field';
import { useAppStore } from '../../stores/appStore';

interface CategoryCardProps {
  category: Category;
  categories: Category[];
  subCategories: SubCategory[];
}

function CategoryCard({ category, categories, subCategories }: CategoryCardProps) {
  const renameCategory = useAppStore((s) => s.renameCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);
  const moveCategory = useAppStore((s) => s.moveCategory);
  const addSubCategory = useAppStore((s) => s.addSubCategory);
  const renameSubCategory = useAppStore((s) => s.renameSubCategory);
  const deleteSubCategory = useAppStore((s) => s.deleteSubCategory);
  const moveSubCategory = useAppStore((s) => s.moveSubCategory);

  const [editingCategory, setEditingCategory] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState(category.name);
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
    setEditingCategory(false);
    setMessage('カテゴリー名を変更しました。');
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
            <TextInput
              value={categoryDraft}
              onChange={(event) => setCategoryDraft(event.target.value)}
              maxLength={40}
              aria-label="カテゴリー名"
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
                  setEditingCategory(true);
                }}
              >
                名前変更
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
  const [message, setMessage] = useState('');

  const active = activeCategories(categories);
  const archived = categories.filter((category) => category.archivedAt !== undefined);

  const onAddCategory = (event: FormEvent) => {
    event.preventDefault();
    const id = addCategory(newCategoryName);
    if (id === '') {
      setMessage('同じ名前のカテゴリーがあるか、名前が空です。');
      return;
    }
    setNewCategoryName('');
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
