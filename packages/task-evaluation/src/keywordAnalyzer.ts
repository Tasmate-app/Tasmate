import type {
  CrystalType,
  TaskDifficulty,
  TaskEvaluation,
  TaskEvaluationInput,
} from '@tasmate/types';

interface KeywordGroup {
  type: CrystalType;
  keywords: readonly string[];
}

/**
 * 結晶タイプごとの組み込みキーワード。
 * 一致数と最長一致でスコアリングするため、配列順は同点時の優先順位として扱う。
 */
export const CRYSTAL_KEYWORD_GROUPS: readonly KeywordGroup[] = [
  {
    type: 'thought_crystal',
    keywords: [
      '計算',
      '数学',
      '論理',
      'プログラミング',
      'コード',
      'コーディング',
      '設計',
      '分析',
      '問題',
      '演習',
      'アルゴリズム',
      '証明',
      'デバッグ',
      '実装',
      '開発',
    ],
  },
  {
    type: 'creation_crystal',
    keywords: [
      '作成',
      '制作',
      '作文',
      'レポート',
      '資料',
      'デザイン',
      'イラスト',
      '執筆',
      '動画',
      '企画',
      'スライド',
      'プレゼン',
      '編集',
      '作曲',
      '絵画',
    ],
  },
  {
    type: 'exploration_crystal',
    keywords: [
      '調査',
      '研究',
      '実験',
      '探索',
      '検証',
      'インタビュー',
      'フィールド',
      '観察',
      'ヒアリング',
      'アンケート',
    ],
  },
  {
    type: 'effort_crystal',
    keywords: [
      '筋トレ',
      '運動',
      '練習',
      '反復',
      '掃除',
      '片付け',
      'ルーティン',
      '作業',
      'トレーニング',
      'ランニング',
      'ストレッチ',
      '洗濯',
      '料理',
    ],
  },
  {
    type: 'knowledge_crystal',
    keywords: [
      '勉強',
      '学習',
      '暗記',
      '読書',
      '講義',
      '英語',
      '理科',
      '社会',
      '資格',
      '復習',
      '予習',
      '単語',
      '用語',
      'ノート',
      'インプット',
      '試験',
    ],
  },
];

/** カテゴリ名から既定の結晶タイプを推定するための対応表 */
export const CATEGORY_CRYSTAL_DEFAULTS: Readonly<Record<string, CrystalType>> = {
  勉強: 'knowledge_crystal',
  学習: 'knowledge_crystal',
  読書: 'knowledge_crystal',
  英語: 'knowledge_crystal',
  暗記: 'knowledge_crystal',
  資格: 'knowledge_crystal',
  仕事: 'thought_crystal',
  開発: 'thought_crystal',
  作業: 'thought_crystal',
  プログラミング: 'thought_crystal',
  数学: 'thought_crystal',
  計算: 'thought_crystal',
  創作: 'creation_crystal',
  制作: 'creation_crystal',
  デザイン: 'creation_crystal',
  イラスト: 'creation_crystal',
  研究: 'exploration_crystal',
  調査: 'exploration_crystal',
  実験: 'exploration_crystal',
  運動: 'effort_crystal',
  筋トレ: 'effort_crystal',
  家事: 'effort_crystal',
  掃除: 'effort_crystal',
  ランニング: 'effort_crystal',
  その他: 'knowledge_crystal',
};

export function normalizeKeywordText(value: string): string {
  return value.normalize('NFKC').toLowerCase().trim();
}

/** カテゴリ名から既定の結晶タイプを推定する。該当しない場合は undefined */
export function inferCategoryCrystalType(categoryName: string): CrystalType | undefined {
  const normalizedName = normalizeKeywordText(categoryName);
  if (normalizedName === '') return undefined;

  let best: { type: CrystalType; length: number } | null = null;
  for (const [name, type] of Object.entries(CATEGORY_CRYSTAL_DEFAULTS)) {
    const normalizedKey = normalizeKeywordText(name);
    if (!normalizedName.includes(normalizedKey)) continue;
    if (best === null || normalizedKey.length > best.length) {
      best = { type, length: normalizedKey.length };
    }
  }
  return best?.type;
}

function analysisText(input: TaskEvaluationInput): string {
  return normalizeKeywordText(
    `${input.title} ${input.description} ${input.subject ?? ''}`,
  );
}

function categoryDefaultType(input: TaskEvaluationInput): CrystalType {
  return (
    input.categoryDefaultType ??
    inferCategoryCrystalType(input.category) ??
    'knowledge_crystal'
  );
}

function findUserKeywordMatch(input: TaskEvaluationInput): string | null {
  const keywords = input.categoryKeywords ?? [];
  if (keywords.length === 0) return null;
  const text = analysisText(input);
  let best: string | null = null;
  for (const keyword of keywords) {
    const normalized = normalizeKeywordText(keyword);
    if (normalized === '' || !text.includes(normalized)) continue;
    if (best === null || normalized.length > best.length) best = normalized;
  }
  return best;
}

function findBuiltInType(input: TaskEvaluationInput): CrystalType | null {
  const text = analysisText(input);
  let best: { type: CrystalType; count: number; longest: number } | null = null;

  for (const group of CRYSTAL_KEYWORD_GROUPS) {
    let count = 0;
    let longest = 0;
    for (const keyword of group.keywords) {
      const normalized = normalizeKeywordText(keyword);
      if (normalized === '' || !text.includes(normalized)) continue;
      count += 1;
      longest = Math.max(longest, normalized.length);
    }
    if (count === 0) continue;
    if (
      best === null ||
      count > best.count ||
      (count === best.count && longest > best.longest)
    ) {
      best = { type: group.type, count, longest };
    }
  }

  return best?.type ?? null;
}

function inferDifficulty(input: TaskEvaluationInput): TaskDifficulty {
  const minutes = Math.max(input.actualMinutes, input.estimatedMinutes);
  const text = `${input.title} ${input.description}`.toLowerCase();
  if (minutes >= 120 || text.includes('大量') || text.includes('長時間') || text.includes('集中')) {
    return 5;
  }
  if (minutes >= 60) return 4;
  if (minutes >= 30) return 3;
  if (minutes >= 15) return 2;
  return 1;
}

/**
 * タスク内容とカテゴリ設定から結晶タイプを決める。
 * 優先順位はユーザー定義キーワード、組み込みキーワード、カテゴリ既定タイプ、知識の結晶。
 */
export function analyzeTaskByKeywords(input: TaskEvaluationInput): TaskEvaluation {
  const userKeyword = findUserKeywordMatch(input);
  const builtInType = userKeyword === null ? findBuiltInType(input) : null;
  const materialType = userKeyword !== null
    ? categoryDefaultType(input)
    : builtInType ?? categoryDefaultType(input);

  const reason = userKeyword !== null
    ? `カテゴリのキーワード「${userKeyword}」に一致`
    : builtInType !== null
      ? 'タスク内容のキーワードに一致'
      : 'カテゴリの既定タイプを使用';

  return {
    materialType,
    difficulty: inferDifficulty(input),
    confidence: userKeyword !== null ? 0.55 : builtInType !== null ? 0.45 : 0.35,
    reason,
    source: 'keyword',
  };
}

