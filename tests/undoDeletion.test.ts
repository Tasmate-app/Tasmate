import { describe, expect, it } from 'vitest';
import {
  createAppStore,
  initialAppState,
  toAppStateSnapshot,
  toDateKey,
} from '@tasmate/core';

function createStore() {
  return createAppStore({ storage: null, initialState: initialAppState() });
}

function createTask(store: ReturnType<typeof createStore>, title = '英語の復習') {
  return store.getState().createTask({
    title,
    description: '',
    category: '',
    categoryId: 'cat-default-study',
    estimatedMinutes: 25,
  });
}

describe('削除の取り消し', () => {
  it('削除したクエストを元に戻せる', () => {
    const store = createStore();
    const taskId = createTask(store);

    store.getState().deleteTask(taskId);
    expect(store.getState().tasks.find((task) => task.id === taskId)?.archivedAt).toBeDefined();
    expect(store.getState().lastDeletion).toMatchObject({ kind: 'task', label: '英語の復習' });

    store.getState().undoLastDeletion();
    const restored = store.getState().tasks.find((task) => task.id === taskId);
    expect(restored?.archivedAt).toBeUndefined();
    expect(restored?.archiveReason).toBeUndefined();
    expect(store.getState().lastDeletion).toBeNull();
  });

  it('進行中セッションのクエストは削除せず、取り消し対象にもしない', () => {
    const store = createStore();
    const taskId = createTask(store);
    store.getState().startSession(taskId, 'd-hills', ['c-hinata']);

    store.getState().deleteTask(taskId);
    expect(store.getState().tasks.find((task) => task.id === taskId)?.archivedAt).toBeUndefined();
    expect(store.getState().lastDeletion).toBeNull();
  });

  it('カテゴリー削除時は同時に削除したサブカテゴリーだけを復元する', () => {
    const store = createStore();
    const categoryId = store.getState().addCategory('読書');
    const bookId = store.getState().addSubCategory(categoryId, '技術書');
    const novelId = store.getState().addSubCategory(categoryId, '小説');

    store.getState().deleteSubCategory(novelId);
    store.getState().deleteCategory(categoryId);
    expect(store.getState().lastDeletion).toMatchObject({
      kind: 'category',
      subCategoryIds: [bookId],
    });

    store.getState().undoLastDeletion();
    const category = store.getState().categories.find((item) => item.id === categoryId);
    expect(category?.archivedAt).toBeUndefined();
    expect(
      store.getState().subCategories.find((item) => item.id === bookId)?.archivedAt,
    ).toBeUndefined();
    expect(
      store.getState().subCategories.find((item) => item.id === novelId)?.archivedAt,
    ).toBeDefined();
  });

  it('削除したサブカテゴリーを元に戻せる', () => {
    const store = createStore();
    const categoryId = store.getState().addCategory('読書');
    const subCategoryId = store.getState().addSubCategory(categoryId, '技術書');

    store.getState().deleteSubCategory(subCategoryId);
    expect(store.getState().lastDeletion).toMatchObject({
      kind: 'subCategory',
      label: '技術書',
    });

    store.getState().undoLastDeletion();
    expect(
      store.getState().subCategories.find((item) => item.id === subCategoryId)?.archivedAt,
    ).toBeUndefined();
    expect(store.getState().lastDeletion).toBeNull();
  });

  it('削除した繰り返しルールと、同時に削除した予定を元に戻せる', () => {
    const store = createStore();
    const today = toDateKey(new Date());
    const ruleId = store.getState().createRecurrenceRule({
      title: '朝の学習',
      description: '',
      category: '',
      categoryId: 'cat-default-study',
      estimatedMinutes: 25,
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      effectiveFrom: today,
    });

    const generated = store
      .getState()
      .tasks.filter((task) => task.recurrenceId === ruleId && task.scheduledDate !== undefined);
    const upcomingIds = generated
      .filter((task) => (task.scheduledDate ?? '') >= today)
      .map((task) => task.id);
    expect(upcomingIds.length).toBeGreaterThan(0);

    store.getState().deleteRecurrenceRule(ruleId);
    expect(store.getState().recurrenceRules.some((rule) => rule.id === ruleId)).toBe(false);
    expect(store.getState().lastDeletion).toMatchObject({
      kind: 'recurrenceRule',
      label: '朝の学習',
    });
    expect(
      upcomingIds.every(
        (id) => store.getState().tasks.find((task) => task.id === id)?.archivedAt !== undefined,
      ),
    ).toBe(true);

    store.getState().undoLastDeletion();
    expect(store.getState().recurrenceRules.some((rule) => rule.id === ruleId)).toBe(true);
    expect(
      upcomingIds.every(
        (id) => store.getState().tasks.find((task) => task.id === id)?.archivedAt === undefined,
      ),
    ).toBe(true);
    expect(store.getState().lastDeletion).toBeNull();
  });

  it('トーストを閉じた後は元に戻せない', () => {
    const store = createStore();
    const taskId = createTask(store);

    store.getState().deleteTask(taskId);
    store.getState().dismissLastDeletion();
    expect(store.getState().lastDeletion).toBeNull();

    store.getState().undoLastDeletion();
    expect(store.getState().tasks.find((task) => task.id === taskId)?.archivedAt).toBeDefined();
  });

  it('直近の削除情報は保存スナップショットに含めない', () => {
    const store = createStore();
    const taskId = createTask(store);
    store.getState().deleteTask(taskId);

    const snapshot = toAppStateSnapshot(store.getState());
    expect('lastDeletion' in snapshot).toBe(false);
  });
});
