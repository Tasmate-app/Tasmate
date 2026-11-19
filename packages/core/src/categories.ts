import type { Category, CrystalType, RecurrenceRule, SubCategory, Task } from '@tasmate/types';
import { CRYSTAL_TYPES } from './inventory/itemDefinitions';

/**
 * カテゴリー／サブカテゴリーの初期データと移行ロジック。
 * 既存の「カテゴリ（名称）＋科目」を壊さず、ID を持つ階層構造へ移行する。
 * 日付・ID の生成は呼び出し側から渡し、このモジュールは純粋に保つ。
 */

export const CATEGORY_KEYWORD_MAX_COUNT = 20;
export const CATEGORY_KEYWORD_MAX_LENGTH = 24;

const CRYSTAL_TYPE_SET: ReadonlySet<string> = new Set<string>(CRYSTAL_TYPES);

function normalizeKeywordEntry(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed === '' || trimmed.length > CATEGORY_KEYWORD_MAX_LENGTH) return null;
  return trimmed;
}

/** 入力文字列または配列から、保存可能なキーワード配列を作る */
export function sanitizeCategoryKeywords(value: unknown): string[] {
  const entries: unknown[] =
    typeof value === 'string'
      ? value.split(/[,\n、]/)
      : Array.isArray(value)
        ? value
        : [];
  const keywords: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const keyword = normalizeKeywordEntry(entry);
    if (keyword === null) continue;
    const key = keyword.normalize('NFKC').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    keywords.push(keyword);
    if (keywords.length >= CATEGORY_KEYWORD_MAX_COUNT) break;
  }
  return keywords;
}

/** フォームのカンマ区切り文字列をキーワード配列へ変換する */
export function parseKeywordInput(value: string): string[] {
  return sanitizeCategoryKeywords(value);
}

/** キーワード配列をフォーム表示用の文字列へ変換する */
export function formatKeywordInput(keywords: readonly string[] | undefined): string {
  return (keywords ?? []).join('、');
}

export function normalizeCategoryCrystalType(value: unknown): CrystalType | undefined {
  return typeof value === 'string' && CRYSTAL_TYPE_SET.has(value)
    ? (value as CrystalType)
    : undefined;
}

interface DefaultSubCategorySeed {
  id: string;
  name: string;
}

interface DefaultCategorySeed {
  id: string;
  name: string;
  defaultCrystalType: CrystalType;
  keywords: readonly string[];
  subCategories: DefaultSubCategorySeed[];
}

/**
 * 既存アプリのカテゴリー名を維持した初期カテゴリー。
 * 科目として使われていた代表的な値を初期サブカテゴリーとして用意する。
 */
export const DEFAULT_CATEGORY_SEEDS: readonly DefaultCategorySeed[] = [
  {
    id: 'cat-default-study',
    name: '勉強',
    defaultCrystalType: 'knowledge_crystal',
    keywords: ['勉強', '学習', '暗記', '読書', '講義', '復習', '予習', '資格', '単語'],
    subCategories: [
      { id: 'sub-default-study-math', name: '数学' },
      { id: 'sub-default-study-english', name: '英語' },
      { id: 'sub-default-study-physics', name: '物理' },
      { id: 'sub-default-study-chemistry', name: '化学' },
    ],
  },
  {
    id: 'cat-default-work',
    name: '作業',
    defaultCrystalType: 'thought_crystal',
    keywords: ['作業', 'プログラミング', 'コード', '設計', '開発', '分析'],
    subCategories: [
      { id: 'sub-default-work-programming', name: 'プログラミング' },
      { id: 'sub-default-work-illustration', name: 'イラスト' },
      { id: 'sub-default-work-video', name: '動画編集' },
    ],
  },
  {
    id: 'cat-default-exercise',
    name: '運動',
    defaultCrystalType: 'effort_crystal',
    keywords: ['運動', '筋トレ', 'ランニング', 'ストレッチ', 'トレーニング'],
    subCategories: [
      { id: 'sub-default-exercise-strength', name: '筋力トレーニング' },
      { id: 'sub-default-exercise-running', name: 'ランニング' },
      { id: 'sub-default-exercise-stretch', name: 'ストレッチ' },
    ],
  },
  {
    id: 'cat-default-chores',
    name: '家事',
    defaultCrystalType: 'effort_crystal',
    keywords: ['家事', '掃除', '片付け', '洗濯', '料理'],
    subCategories: [],
  },
  {
    id: 'cat-default-other',
    name: 'その他',
    defaultCrystalType: 'knowledge_crystal',
    keywords: [],
    subCategories: [],
  },
] as const;


export function createDefaultCategories(nowIso: string): {
  categories: Category[];
  subCategories: SubCategory[];
} {
  const categories: Category[] = [];
  const subCategories: SubCategory[] = [];
  DEFAULT_CATEGORY_SEEDS.forEach((seed, categoryIndex) => {
    categories.push({
      id: seed.id,
      name: seed.name,
      order: categoryIndex,
      createdAt: nowIso,
      updatedAt: nowIso,
      defaultCrystalType: seed.defaultCrystalType,
      keywords: seed.keywords.length > 0 ? [...seed.keywords] : undefined,
    });
    seed.subCategories.forEach((sub, subIndex) => {
      subCategories.push({
        id: sub.id,
        categoryId: seed.id,
        name: sub.name,
        order: subIndex,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    });
  });
  return { categories, subCategories };
}

export function sortCategories(categories: readonly Category[]): Category[] {
  return [...categories].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ja'));
}

export function sortSubCategories(subCategories: readonly SubCategory[]): SubCategory[] {
  return [...subCategories].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ja'),
  );
}

/** 新規選択に使えるカテゴリー（削除済みを除く） */
export function activeCategories(categories: readonly Category[]): Category[] {
  return sortCategories(categories.filter((category) => category.archivedAt === undefined));
}

/** 新規選択に使えるサブカテゴリー（削除済み・別カテゴリーを除く） */
export function activeSubCategories(
  subCategories: readonly SubCategory[],
  categoryId: string | undefined,
): SubCategory[] {
  if (categoryId === undefined) return [];
  return sortSubCategories(
    subCategories.filter(
      (subCategory) =>
        subCategory.categoryId === categoryId && subCategory.archivedAt === undefined,
    ),
  );
}

export function findCategoryById(
  categories: readonly Category[],
  id: string | undefined,
): Category | undefined {
  if (id === undefined) return undefined;
  return categories.find((category) => category.id === id);
}

export function findSubCategoryById(
  subCategories: readonly SubCategory[],
  id: string | undefined,
): SubCategory | undefined {
  if (id === undefined) return undefined;
  return subCategories.find((subCategory) => subCategory.id === id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonNegativeOrder(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

/** 保存データからカテゴリーを検証・正規化する */
export function normalizeCategoryList(value: unknown): Category[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const categories: Category[] = [];
  value.forEach((entry, index) => {
    if (!isRecord(entry)) return;
    const id = entry['id'];
    const name = entry['name'];
    if (typeof id !== 'string' || id === '' || typeof name !== 'string' || name.trim() === '') {
      return;
    }
    if (seen.has(id)) return;
    seen.add(id);
    const keywords = sanitizeCategoryKeywords(entry['keywords']);
    const defaultCrystalType = normalizeCategoryCrystalType(entry['defaultCrystalType']);
    categories.push({
      id,
      name: name.trim(),
      order: nonNegativeOrder(entry['order'], index),
      createdAt: typeof entry['createdAt'] === 'string' ? entry['createdAt'] : new Date(0).toISOString(),
      updatedAt: typeof entry['updatedAt'] === 'string' ? entry['updatedAt'] : new Date(0).toISOString(),
      archivedAt: typeof entry['archivedAt'] === 'string' ? entry['archivedAt'] : undefined,
      keywords: keywords.length > 0 ? keywords : undefined,
      defaultCrystalType,
    });
  });
  return sortCategories(categories);
}

/** 保存データからサブカテゴリーを検証・正規化する（親が存在するものだけ残す） */
export function normalizeSubCategoryList(
  value: unknown,
  categories: readonly Category[],
): SubCategory[] {
  if (!Array.isArray(value)) return [];
  const categoryIds = new Set(categories.map((category) => category.id));
  const seen = new Set<string>();
  const subCategories: SubCategory[] = [];
  value.forEach((entry, index) => {
    if (!isRecord(entry)) return;
    const id = entry['id'];
    const categoryId = entry['categoryId'];
    const name = entry['name'];
    if (
      typeof id !== 'string' ||
      id === '' ||
      typeof categoryId !== 'string' ||
      !categoryIds.has(categoryId) ||
      typeof name !== 'string' ||
      name.trim() === ''
    ) {
      return;
    }
    if (seen.has(id)) return;
    seen.add(id);
    subCategories.push({
      id,
      categoryId,
      name: name.trim(),
      order: nonNegativeOrder(entry['order'], index),
      createdAt: typeof entry['createdAt'] === 'string' ? entry['createdAt'] : new Date(0).toISOString(),
      updatedAt: typeof entry['updatedAt'] === 'string' ? entry['updatedAt'] : new Date(0).toISOString(),
      archivedAt: typeof entry['archivedAt'] === 'string' ? entry['archivedAt'] : undefined,
    });
  });
  return sortSubCategories(subCategories);
}

export interface CategoryMigrationInput {
  tasks: Task[];
  recurrenceRules: RecurrenceRule[];
  /** 既に保存されている場合はその値も活かす */
  categories?: Category[];
  subCategories?: SubCategory[];
  nowIso: string;
}

export interface CategoryMigrationResult {
  categories: Category[];
  subCategories: SubCategory[];
  tasks: Task[];
  recurrenceRules: RecurrenceRule[];
}

/**
 * 旧データの「category（名称）」「subject（科目）」を
 * カテゴリー ID・サブカテゴリー ID へ移行する。
 * 名称はスナップショットとして保持し、元データを削除しない。
 *
 * 同じ入力からは同じ ID を生成するため、保存前に再実行しても重複しない。
 */
export function migrateCategorySystem(input: CategoryMigrationInput): CategoryMigrationResult {
  const defaults = createDefaultCategories(input.nowIso);
  const categories = normalizeCategoryList([
    ...defaults.categories,
    ...(input.categories ?? []),
  ]);
  const subCategories = normalizeSubCategoryList(
    [...defaults.subCategories, ...(input.subCategories ?? [])],
    categories,
  );

  const categoryByName = new Map<string, Category>();
  const categoryById = new Map<string, Category>();
  for (const category of categories) {
    categoryById.set(category.id, category);
    if (!categoryByName.has(category.name)) categoryByName.set(category.name, category);
  }
  const subByKey = new Map<string, SubCategory>();
  const subById = new Map<string, SubCategory>();
  for (const sub of subCategories) {
    subById.set(sub.id, sub);
    subByKey.set(`${sub.categoryId}\u0000${sub.name}`, sub);
  }

  const ensureCategory = (name: string): Category => {
    const trimmed = name.trim() === '' ? 'その他' : name.trim();
    const existing = categoryByName.get(trimmed);
    if (existing !== undefined) return existing;
    const category: Category = {
      id: `cat-legacy-${categoryByName.size + categoryById.size}`,
      name: trimmed,
      order: categories.filter((item) => item.archivedAt === undefined).length,
      createdAt: input.nowIso,
      updatedAt: input.nowIso,
    };
    categories.push(category);
    categoryById.set(category.id, category);
    categoryByName.set(category.name, category);
    return category;
  };

  const ensureSubCategory = (categoryId: string, name: string): SubCategory => {
    const trimmed = name.trim();
    const existing = subByKey.get(`${categoryId}\u0000${trimmed}`);
    if (existing !== undefined) return existing;
    const subCategory: SubCategory = {
      id: `sub-legacy-${categoryId}-${subByKey.size}`,
      categoryId,
      name: trimmed,
      order: subCategories.filter(
        (item) => item.categoryId === categoryId && item.archivedAt === undefined,
      ).length,
      createdAt: input.nowIso,
      updatedAt: input.nowIso,
    };
    subCategories.push(subCategory);
    subById.set(subCategory.id, subCategory);
    subByKey.set(`${categoryId}\u0000${trimmed}`, subCategory);
    return subCategory;
  };

  const migrateOne = <T extends Task | RecurrenceRule>(item: T): T => {
    const rawCategoryName =
      typeof item.category === 'string' && item.category.trim() !== ''
        ? item.category.trim()
        : 'その他';
    let category =
      item.categoryId !== undefined ? categoryById.get(item.categoryId) : undefined;
    if (category === undefined) category = ensureCategory(rawCategoryName);

    const rawSubName =
      (typeof item.subCategoryName === 'string' && item.subCategoryName.trim() !== ''
        ? item.subCategoryName
        : undefined) ??
      (typeof item.subject === 'string' && item.subject.trim() !== ''
        ? item.subject
        : undefined);

    let subCategory =
      item.subCategoryId !== undefined ? subById.get(item.subCategoryId) : undefined;
    if (subCategory !== undefined && subCategory.categoryId !== category.id) {
      subCategory = undefined;
    }
    const subName = rawSubName?.trim();
    if (subCategory === undefined && subName !== undefined && subName !== '') {
      subCategory = ensureSubCategory(category.id, subName);
    }

    return {
      ...item,
      category: category.name,
      categoryId: category.id,
      subCategoryName: subCategory?.name ?? subName,
      subCategoryId: subCategory?.id,
    };
  };

  const migratedTasks = input.tasks.map(migrateOne);
  const migratedRules = input.recurrenceRules.map(migrateOne);

  return {
    categories: sortCategories(categories),
    subCategories: sortSubCategories(subCategories),
    tasks: migratedTasks,
    recurrenceRules: migratedRules,
  };
}
