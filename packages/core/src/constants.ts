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
  /** 休憩として設定できる時間の下限・上限（分） */
  minRestMinutes: 1,
  maxRestMinutes: 60,
  /** 作業時間に応じた休憩の推奨時間（分）。上から順に判定する */
  restSuggestionThresholds: [
    { workMinutes: 90, restMinutes: 20 },
    { workMinutes: 50, restMinutes: 15 },
    { workMinutes: 25, restMinutes: 10 },
  ],
  /** この時間内に次の作業を始め、休憩を完了していなければ連続作業とみなす */
  consecutiveWorkWindowMinutes: 30,
  /** 連続作業がこの時間を超えたら応援イベントを出す（分） */
  longWorkSupportMinutes: 50,
  /** 応援イベントの保持上限（古いものから削除） */
  maxSupportEvents: 20,
  /** アイテム増減履歴の保持上限 */
  maxItemHistory: 500,
  /** タスク報酬抽選履歴の保持上限 */
  maxTaskRewards: 500,
} as const;

/**
 * 週間カレンダー・継続報酬の設定。
 * 倍率表・達成条件・週の開始日はここで一元管理し、UI や計算に直書きしない。
 */
export const WEEKLY_RULES = {
  /** 週の開始曜日（1=月曜） */
  weekStartsOn: 1,
  /** 週間達成に必要な達成率 */
  achievementThreshold: 0.8,
  /** 設定変更で過去の判定が変わらないよう履歴に記録するバージョン */
  ruleVersion: 'weekly-v1',
  /** 未判定週をさかのぼる上限（暴走防止） */
  maxCatchUpWeeks: 260,
  /** 休憩週の設定（初期実装では連続利用のみ制限する） */
  restWeek: {
    enabled: true,
    maxConsecutiveWeeks: 2,
  },
  /**
   * タスク完了報酬のどこに継続倍率を適用するか。
   * 施設生産やログイン報酬など別系統の報酬には自動適用しない。
   */
  rewardMultiplier: {
    appliesToTaskCompletion: true,
    channels: {
      currency: true,
      materials: true,
      experience: true,
    },
  },
  /** 連続達成週数に応じたランクと倍率 */
  ranks: [
    { id: 'rookie', name: 'ルーキー', minStreak: 0, maxStreak: 1, multiplier: 1.0 },
    { id: 'tracker', name: 'トラッカー', minStreak: 2, maxStreak: 2, multiplier: 1.1 },
    { id: 'ranger', name: 'レンジャー', minStreak: 3, maxStreak: 3, multiplier: 1.2 },
    { id: 'captain', name: 'キャプテン', minStreak: 4, maxStreak: 4, multiplier: 1.3 },
    { id: 'ace', name: 'エース', minStreak: 5, maxStreak: 5, multiplier: 1.4 },
    { id: 'master', name: 'マスター', minStreak: 6, maxStreak: 6, multiplier: 1.5 },
    { id: 'grandmaster', name: 'グランドマスター', minStreak: 7, maxStreak: 7, multiplier: 1.6 },
    { id: 'legend', name: 'レジェンド', minStreak: 8, maxStreak: 999, multiplier: 1.75 },
  ],
} as const;

/**
 * 予定クエスト通知の設定。
 * 通知の予約数・猶予・識別子をここで一元管理し、UI や計算に直書きしない。
 */
export const NOTIFICATION_RULES = {
  /** 開始時刻が未設定の予定に使う既定時刻（ローカル HH:mm） */
  defaultStartTime: '09:00',
  /** 未完了通知の猶予として設定できる下限・上限（分） */
  minDelayMinutes: 1,
  maxDelayMinutes: 1440,
  /** 未完了通知の猶予の初期値（分） */
  defaultDelayMinutes: 10,
  /** OS に同時予約する通知の上限。近い順に採用する */
  maxScheduledNotifications: 64,
  /** このアプリが予約した通知だけを識別するための prefix */
  identifierPrefix: 'tasmate:',
  /** Android の通知チャンネル ID */
  channelId: 'task-reminders',
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
