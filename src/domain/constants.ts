/**
 * ゲームバランス定数。
 *
 * 【仮実装】 docs/02_game_design.md, docs/05_roadmap_and_open_questions.md のとおり
 * 数値・報酬式・属性倍率・施設生産量は未確定のため、以下の値は MVP 検証用の仮値である。
 * 仕様確定後に更新し、関連ドキュメントとテストも合わせて見直すこと。
 */
export const BALANCE = {
  /** 作業1分あたりの基礎通貨報酬 */
  currencyPerMinute: 10,
  /** 1セッションの通貨報酬上限（誇張入力・放置対策の暫定上限） */
  maxCurrencyPerSession: 3000,
  /** 1セッションの素材報酬上限（種類ごと） */
  maxMaterialPerSession: 60,
  /** 作業1分あたりの基礎素材収集量（効率1.0のキャラ1人の場合） */
  materialPerMinute: 0.5,
  /** 未完了（中断）時の報酬係数。休息・再開しやすさを損なわないよう0にしない */
  interruptedRewardFactor: 0.5,
  /** 属性相性一致時の効率倍率（仮） */
  affinityBonus: 1.5,
  /** キャラ1レベルごとの効率上昇率（仮） */
  efficiencyPerLevel: 0.1,
  /** キャラ経験値：作業1分あたり */
  experiencePerMinute: 5,
  /** レベルアップに必要な経験値（Lv × この値） */
  experiencePerLevel: 100,
  /** レベルアップ費用：通貨（Lv × この値） */
  levelUpCostPerLevel: 50,
  /** 施設生産：作業1分あたりの基礎生産量に対する係数 */
  facilityProductionFactor: 1.0,
  /** 施設レベルごとの生産上昇率 */
  facilityPerLevel: 0.5,
  /** 施設強化費用：通貨（Lv × この値、施設ごと） */
  facilityUpgradeCostPerLevel: 80,
  /** ごく短い作業（分未満・数秒）を切り捨てる下限（秒） */
  minimumBillableSeconds: 60,
} as const;

/** 素材の表示名 */
export const MATERIAL_NAMES: Record<string, string> = {
  shard_sun: '太陽のかけら',
  shard_moon: '月のかけら',
  shard_star: '星のかけら',
};

/** 属性の表示名 */
export const ATTRIBUTE_NAMES: Record<string, string> = {
  sun: '太陽',
  moon: '月',
  star: '星',
  none: '無',
};
