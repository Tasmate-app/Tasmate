import type {
  AIRewardEvaluation,
  CrystalType,
  TaskAnalysisInput,
  TaskDifficulty,
} from '@tasmate/types';

const KEYWORD_GROUPS: ReadonlyArray<{ type: CrystalType; keywords: readonly string[] }> = [
  {
    type: 'thought_crystal',
    keywords: ['計算', '数学', '論理', 'プログラミング', 'コード', '設計', '分析', '問題', '演習', 'アルゴリズム'],
  },
  {
    type: 'creation_crystal',
    keywords: ['作成', '制作', '作文', 'レポート', '資料', 'デザイン', 'イラスト', '執筆', '動画', '企画'],
  },
  {
    type: 'exploration_crystal',
    keywords: ['調査', '研究', '実験', '探索', '検証', 'インタビュー', 'フィールド', '観察'],
  },
  {
    type: 'effort_crystal',
    keywords: ['筋トレ', '運動', '練習', '反復', '掃除', '片付け', 'ルーティン', '作業', 'トレーニング'],
  },
  {
    type: 'knowledge_crystal',
    keywords: ['勉強', '学習', '暗記', '読書', '講義', '英語', '理科', '社会', '資格', '復習', '予習'],
  },
];

const CATEGORY_DEFAULTS: Record<string, CrystalType> = {
  勉強: 'knowledge_crystal',
  学習: 'knowledge_crystal',
  仕事: 'thought_crystal',
  開発: 'thought_crystal',
  創作: 'creation_crystal',
  研究: 'exploration_crystal',
  運動: 'effort_crystal',
  家事: 'effort_crystal',
};

function findKeywordType(input: TaskAnalysisInput): CrystalType | null {
  const text = `${input.title} ${input.description} ${input.subject ?? ''}`.toLowerCase();
  for (const group of KEYWORD_GROUPS) {
    if (group.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return group.type;
    }
  }
  return null;
}

function inferDifficulty(input: TaskAnalysisInput): TaskDifficulty {
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
 * モデルが使えない場合の決定的な代替判定。
 * ネットワーク・モデル・端末性能に依存せず、報酬処理を止めない。
 */
export function analyzeTaskFallback(input: TaskAnalysisInput): AIRewardEvaluation {
  const materialType =
    findKeywordType(input) ??
    CATEGORY_DEFAULTS[input.category] ??
    'knowledge_crystal';
  const difficulty = inferDifficulty(input);
  return {
    materialType,
    difficulty,
    confidence: 0.35,
    reason: 'カテゴリとキーワードによる代替判定',
    source: 'fallback',
  };
}
