import { describe, expect, it } from 'vitest';
import type { RecurrenceRule, Task } from '../src/types/index';
import type { AppState } from '@tasmate/core';
import {
  activeCategories,
  activeSubCategories,
  createAppStore,
  initialAppState,
  normalizeAppState,
  parseKeywordInput,
  resolveClassification,
} from '@tasmate/core';

function legacyTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-legacy',
    title: '旧タスク',
    description: '',
    category: '勉強',
    subject: '数学',
    estimatedMinutes: 25,
    status: 'planned',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function legacyRule(overrides: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    id: 'rule-legacy',
    title: '旧繰り返し',
    description: '',
    category: '作業',
    subject: '動画編集',
    estimatedMinutes: 30,
    frequency: 'weekly',
    daysOfWeek: [1],
    effectiveFrom: '2026-10-19',
    isActive: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function legacyState(overrides: Partial<AppState> = {}): AppState {
  return {
    version: 1,
    tasks: [],
    activeSession: null,
    sessionHistory: [],
    inventory: { currency: 0, materials: { shard_sun: 0, shard_moon: 0, shard_star: 0 } },
    itemInventory: {},
    itemHistory: [],
    taskRewards: [],
    stardustCarry: 0,
    characters: [],
    facilities: [],
    rewards: [],
    appliedRewardSessionIds: [],
    recurrenceRules: [],
    categories: [],
    subCategories: [],
    categorySystemInitialized: false,
    weeklyEvaluations: [],
    weeklyProgress: {
      userId: 'local-user',
      currentStreak: 0,
      totalSuccessfulWeeks: 0,
      highestStreak: 0,
      trackingStartedWeek: '2026-10-19',
      lastEvaluatedWeekStart: null,
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    restWeeks: [],
    restSession: null,
    supportEvents: [],
    ...overrides,
  } as AppState;
}

describe('カテゴリーの初期化と移行', () => {
  it('初期状態には既定カテゴリーとサブカテゴリーが入り、移行済みになる', () => {
    const state = initialAppState();
    expect(state.categorySystemInitialized).toBe(true);
    expect(state.categories.map((category) => category.name)).toEqual([
      '勉強',
      '作業',
      '運動',
      '家事',
      'その他',
    ]);
    expect(activeSubCategories(state.subCategories, 'cat-default-study').map((sub) => sub.name)).toEqual([
      '数学',
      '英語',
      '物理',
      '化学',
    ]);
  });

  it('旧データの category / subject を ID とサブカテゴリーへ移行する', () => {
    const now = new Date(2026, 10, 9, 12);
    const normalized = normalizeAppState(
      legacyState({
        tasks: [
          legacyTask(),
          legacyTask({ id: 'task-custom', category: '仕事', subject: '顧客対応' }),
        ],
        recurrenceRules: [legacyRule()],
      }),
      now,
    );

    const study = normalized.categories.find((category) => category.name === '勉強');
    const math = normalized.subCategories.find((sub) => sub.name === '数学');
    expect(normalized.categorySystemInitialized).toBe(true);
    expect(normalized.tasks[0].categoryId).toBe(study?.id);
    expect(normalized.tasks[0].subCategoryId).toBe(math?.id);
    expect(normalized.tasks[0].subject).toBe('数学');

    const custom = normalized.categories.find((category) => category.name === '仕事');
    const customSub = normalized.subCategories.find((sub) => sub.name === '顧客対応');
    expect(normalized.tasks[1].categoryId).toBe(custom?.id);
    expect(normalized.tasks[1].subCategoryId).toBe(customSub?.id);
    expect(customSub?.categoryId).toBe(custom?.id);

    const work = normalized.categories.find((category) => category.name === '作業');
    const video = normalized.subCategories.find((sub) => sub.name === '動画編集');
    expect(normalized.recurrenceRules[0].categoryId).toBe(work?.id);
    expect(normalized.recurrenceRules[0].subCategoryId).toBe(video?.id);
  });

  it('移行を繰り返してもカテゴリーが重複しない', () => {
    const now = new Date(2026, 10, 9, 12);
    const once = normalizeAppState(
      legacyState({ tasks: [legacyTask({ category: '新しい分類', subject: '項目' })] }),
      now,
    );
    const twice = normalizeAppState(once, now);
    expect(twice.categories).toHaveLength(once.categories.length);
    expect(twice.subCategories).toHaveLength(once.subCategories.length);
    expect(twice.tasks[0]).toEqual(once.tasks[0]);
  });

  it('親カテゴリーが存在しないサブカテゴリーは破棄する', () => {
    const now = new Date(2026, 10, 9, 12);
    const normalized = normalizeAppState(
      legacyState({
        categorySystemInitialized: true,
        categories: [],
        subCategories: [
          {
            id: 'sub-orphan',
            categoryId: 'missing',
            name: '孤立',
            order: 0,
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-01T00:00:00.000Z',
          },
        ],
      }),
      now,
    );
    expect(normalized.subCategories).toEqual([]);
  });
});

describe('カテゴリー管理アクション', () => {
  it('追加・名称変更・並び替え・論理削除ができる', () => {
    const store = createAppStore({ storage: null, initialState: initialAppState() });
    const addedId = store.getState().addCategory('読書');
    expect(addedId).not.toBe('');

    expect(store.getState().addCategory('読書')).toBe('');
    expect(store.getState().addCategory('   ')).toBe('');

    store.getState().renameCategory(addedId, 'インプット');
    expect(store.getState().categories.find((category) => category.id === addedId)?.name).toBe(
      'インプット',
    );

    store.getState().moveCategory(addedId, 'up');
    const active = activeCategories(store.getState().categories);
    expect(active[active.length - 2]?.id).toBe(addedId);

    const subId = store.getState().addSubCategory(addedId, '技術書');
    expect(subId).not.toBe('');
    expect(store.getState().addSubCategory(addedId, '技術書')).toBe('');

    store.getState().deleteCategory(addedId);
    expect(activeCategories(store.getState().categories).some((item) => item.id === addedId)).toBe(
      false,
    );
    expect(
      store.getState().subCategories.find((sub) => sub.id === subId)?.archivedAt,
    ).toBeDefined();
  });

  it('タスク作成時にカテゴリー名とサブカテゴリー名をスナップショットする', () => {
    const store = createAppStore({ storage: null, initialState: initialAppState() });
    store.getState().createTask({
      title: '数学を解く',
      description: '',
      category: '',
      categoryId: 'cat-default-study',
      subCategoryId: 'sub-default-study-math',
      estimatedMinutes: 25,
    });
    const task = store.getState().tasks[0];
    expect(task.category).toBe('勉強');
    expect(task.categoryId).toBe('cat-default-study');
    expect(task.subject).toBe('数学');
    expect(task.subCategoryName).toBe('数学');
    expect(task.subCategoryId).toBe('sub-default-study-math');

    store.getState().startSession(task.id, 'd-hills', ['c-hinata']);
    const session = store.getState().activeSession;
    expect(session?.firstStartedAt).toBe(session?.startedAt);
    expect(session?.taskTitleSnapshot).toBe('数学を解く');
    expect(session?.categoryNameSnapshot).toBe('勉強');
    expect(session?.subCategoryNameSnapshot).toBe('数学');
  });

  it('カテゴリー名変更は既存タスクの表示名へ反映する', () => {
    const store = createAppStore({ storage: null, initialState: initialAppState() });
    store.getState().createTask({
      title: 'タスク',
      description: '',
      category: '',
      categoryId: 'cat-default-work',
      estimatedMinutes: 25,
    });
    store.getState().renameCategory('cat-default-work', '制作');
    expect(store.getState().tasks[0].category).toBe('制作');
  });
  it('カテゴリーのキーワードと既定結晶タイプを保存・更新できる', () => {
    const store = createAppStore({ storage: null, initialState: initialAppState() });
    const categoryId = store.getState().addCategory('読書', {
      keywords: [' 技術書 ', '技術書', '論文'],
      defaultCrystalType: 'knowledge_crystal',
    });
    const created = store.getState().categories.find((category) => category.id === categoryId);
    expect(created?.keywords).toEqual(['技術書', '論文']);
    expect(created?.defaultCrystalType).toBe('knowledge_crystal');

    store.getState().updateCategoryMetadata(categoryId, { keywords: ['小説'] });
    const updated = store.getState().categories.find((category) => category.id === categoryId);
    expect(updated?.keywords).toEqual(['小説']);
    expect(updated?.defaultCrystalType).toBeUndefined();
  });

  it('キーワード入力を正規化し、上限を超える入力を切り捨てる', () => {
    expect(parseKeywordInput(' 技術書,、論文\n技術書 ')).toEqual(['技術書', '論文']);
    const many = Array.from({ length: 30 }, (_, index) => `キーワード${index}`);
    expect(parseKeywordInput(many.join(','))).toHaveLength(20);
  });

  it('既定カテゴリーには結晶タイプとキーワードが設定される', () => {
    const state = initialAppState();
    const study = state.categories.find((category) => category.id === 'cat-default-study');
    expect(study?.defaultCrystalType).toBe('knowledge_crystal');
    expect(study?.keywords).toContain('勉強');
  });

  it('保存データ読み込み時にカテゴリーのメタデータを保持する', () => {
    const normalized = normalizeAppState(
      legacyState({
        categorySystemInitialized: true,
        categories: [
          {
            id: 'cat-custom',
            name: '読書',
            order: 0,
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-01T00:00:00.000Z',
            keywords: ['技術書', '技術書', '論文'],
            defaultCrystalType: 'knowledge_crystal',
          },
        ],
      }),
      new Date(2026, 10, 9, 12),
    );
    expect(normalized.categories[0]?.keywords).toEqual(['技術書', '論文']);
    expect(normalized.categories[0]?.defaultCrystalType).toBe('knowledge_crystal');
  });

  it('カテゴリー名変更・削除・取り消しでメタデータを保持する', () => {
    const store = createAppStore({ storage: null, initialState: initialAppState() });
    const categoryId = store.getState().addCategory('読書', {
      keywords: ['技術書'],
      defaultCrystalType: 'knowledge_crystal',
    });
    store.getState().renameCategory(categoryId, 'インプット');
    expect(
      store.getState().categories.find((category) => category.id === categoryId)?.keywords,
    ).toEqual(['技術書']);

    store.getState().deleteCategory(categoryId);
    store.getState().undoLastDeletion();
    const restored = store.getState().categories.find((category) => category.id === categoryId);
    expect(restored?.keywords).toEqual(['技術書']);
    expect(restored?.defaultCrystalType).toBe('knowledge_crystal');
  });
});

describe('resolveClassification', () => {
  it('ID を優先し、名前だけの旧入力も既存カテゴリーへ寄せる', () => {
    const state = initialAppState();
    const byId = resolveClassification(state, {
      category: '',
      categoryId: 'cat-default-study',
      subCategoryId: 'sub-default-study-english',
    });
    expect(byId.category).toBe('勉強');
    expect(byId.subCategoryName).toBe('英語');

    const byName = resolveClassification(state, { category: '運動', subject: 'ランニング' });
    expect(byName.categoryId).toBe('cat-default-exercise');
    expect(byName.subCategoryId).toBe('sub-default-exercise-running');
  });
});
