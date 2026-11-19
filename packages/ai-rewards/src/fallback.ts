/**
 * 旧ファイル名との互換用。
 * キーワード判定は通常の判定として扱うため、実装は keywordAnalyzer に置く。
 */
export {
  analyzeTaskByKeywords,
  analyzeTaskFallback,
  CATEGORY_CRYSTAL_DEFAULTS,
  CRYSTAL_KEYWORD_GROUPS,
  inferCategoryCrystalType,
  normalizeKeywordText,
} from './keywordAnalyzer';
