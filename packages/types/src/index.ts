/**
 * 共有型定義（MVP）。
 * docs/04_data_design.md の概念モデルに対応する。
 * 時刻は ISO 8601 文字列（UTC）で保存し、表示時にローカル時刻へ変換する。
 */

/** タスクの状態 */
export type TaskStatus = 'planned' | 'active' | 'interrupted' | 'completed' | 'cancelled';

/** タスクのアーカイブ理由。繰り返しルール変更によるものは再追加時に復元する */
export type TaskArchiveReason = 'user' | 'rule';

/** 作業セッションの結果 */
export type SessionResult = 'completed' | 'interrupted';

/** 作業セッションの状態（タイマー状態機械） */
export type WorkSessionState = 'idle' | 'running' | 'paused';

/**
 * 計測方式。
 * estimate = 予定時間に対する見積タイマー、stopwatch = 予定時間なしのストップウォッチ。
 * stopwatch でも予定日・時刻は任意で設定できる。
 * 未設定は既存データ互換のため estimate として扱う。
 */
export type TimerMode = 'estimate' | 'stopwatch';

/** モバイル版サイドバーに表示できる項目 */
export type MobileNavItemId =
  | 'sortie'
  | 'history'
  | 'base'
  | 'character'
  | 'inventory'
  | 'synthesis';

/** モバイル版サイドバーの表示設定。順序がそのまま表示順になる */
export interface MobileNavItemPreference {
  id: MobileNavItemId;
  visible: boolean;
}

/** アプリ全体のユーザー設定 */
export interface AppSettings {
  /** 最後にバックアップを書き出した日時（ISO 8601）。未実施は null */
  lastBackupAt: string | null;
  /** 初回チュートリアルを完了した日時（ISO 8601）。未完了は null */
  tutorialCompletedAt: string | null;
  /** モバイル版サイドバーの表示項目。Web 版では使用しない */
  navigationItems: MobileNavItemPreference[];
}

/** 報酬レコードの状態 */
export type RewardStatus = 'pending' | 'approved' | 'rejected';

/** キャラクター属性（MVP では3属性＋無属性。種類・倍率は仮） */
export type CharacterAttribute = 'sun' | 'moon' | 'star' | 'none';

/** 素材・アイテム ID（仮の3種。拡張時に追加する） */
export type MaterialId = 'shard_sun' | 'shard_moon' | 'shard_star';

/** タスク */
export interface Task {
  id: string;
  title: string;
  description: string;
  /** カテゴリー名のスナップショット。名称変更・削除後も表示に使う */
  category: string;
  /** カテゴリー ID。旧データでは未設定 */
  categoryId?: string;
  /** 科目名（旧データ互換用）。新規作成時はサブカテゴリー名を保持する */
  subject?: string;
  /** サブカテゴリー ID。未分類の場合は未設定 */
  subCategoryId?: string;
  /** サブカテゴリー名のスナップショット。削除後も履歴表示に使う */
  subCategoryName?: string;
  estimatedMinutes: number;
  /**
   * 計測方式。未設定は estimate。
   * stopwatch の場合は estimatedMinutes を 0（見積なし）として扱う。
   * 予定日・開始時刻・終了時刻は stopwatch でも任意で保持できる。
   */
  timerMode?: TimerMode;
  /** 予定日時（ISO 8601）。既存機能との互換用 */
  scheduledAt?: string;
  /** 予定日（ローカル日付 YYYY-MM-DD）。週間カレンダーの基準 */
  scheduledDate?: string;
  /** 開始時刻（ローカル HH:mm） */
  startTime?: string;
  /** 終了時刻（ローカル HH:mm） */
  endTime?: string;
  /** 繰り返しルールから生成された予定のルール ID */
  recurrenceId?: string;
  /**
   * 繰り返し予定を別の日へ移動した場合の、ルール上の元の予定日。
   * 元の日の予定が再生成されるのを防ぐために保持する。
   */
  originalScheduledDate?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  /** 削除日時。論理削除し、過去の週次判定を壊さない */
  archivedAt?: string;
  /** アーカイブ理由。未設定は旧データまたはユーザー削除として扱う */
  archiveReason?: TaskArchiveReason;
}

/** 繰り返しタスクのルール（初期対応は週次） */
export interface RecurrenceRule {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryId?: string;
  subject?: string;
  subCategoryId?: string;
  subCategoryName?: string;
  estimatedMinutes: number;
  frequency: 'weekly';
  /** 1=月曜 … 7=日曜 */
  daysOfWeek: number[];
  startTime?: string;
  endTime?: string;
  /** 適用開始日（ローカル YYYY-MM-DD） */
  effectiveFrom: string;
  /** 適用終了日（ローカル YYYY-MM-DD、この日を含む） */
  effectiveUntil?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 週次判定の状態 */
export type WeeklyEvaluationStatus = 'achieved' | 'missed' | 'pending' | 'rest';

/** ユーザーの週間継続状態。報酬倍率は連続達成週数から算出する */
export interface WeeklyProgress {
  userId: string;
  /** 週次追跡を開始した週の月曜日 */
  trackingStartedWeek: string;
  currentStreak: number;
  totalSuccessfulWeeks: number;
  highestStreak: number;
  lastEvaluatedWeekStart: string | null;
  updatedAt: string;
}

/** 週次判定の履歴（対象週ごとに1件） */
export interface WeeklyEvaluation {
  id: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  status: WeeklyEvaluationStatus;
  eligibleTaskCount: number;
  completedTaskCount: number;
  /** 対象タスクが0件のときは null */
  completionRate: number | null;
  streakBefore: number;
  streakAfter: number;
  multiplierBefore: number;
  multiplierAfter: number;
  evaluatedAt: string;
  ruleVersion: string;
  /** 判定に使用したタスク ID のスナップショット */
  taskIds: string[];
}

/** 作業セッション（一回分の取り組み記録） */
export interface WorkSession {
  id: string;
  taskId: string;
  /** 開始時刻（ISO 8601）。経過時間はこの時刻を基準に算出する */
  startedAt: string;
  /**
   * セッションを最初に開始した時刻（ISO 8601）。
   * 再開時に startedAt が更新されても、履歴の作業日はこの時刻を優先する。
   */
  firstStartedAt?: string;
  endedAt?: string;
  /** 一時停止中に蓄積された作業秒数（一時停止→再開で加算） */
  accumulatedSeconds: number;
  /**
   * 中断から再開した場合の、過去セグメントの累計作業秒数。
   * 表示上の合計時間にのみ使い、履歴の作業時間には加算しない。
   */
  carriedSeconds?: number;
  /** 一時停止した時刻（running 中は undefined） */
  pausedAt?: string;
  state: WorkSessionState;
  result?: SessionResult;
  /** 開始時点の計測方式。未設定は estimate */
  timerMode?: TimerMode;
  destinationId: string;
  assignedCharacterIds: string[];
  /** 開始時点のタスク名スナップショット（履歴表示用） */
  taskTitleSnapshot?: string;
  /** 開始時点の分類スナップショット（カテゴリー削除後も履歴を表示する） */
  categoryIdSnapshot?: string;
  categoryNameSnapshot?: string;
  subCategoryIdSnapshot?: string;
  subCategoryNameSnapshot?: string;
}

/**
 * 中断して保持しているクエスト。
 * 再開すると新しい WorkSession を開始し、elapsedSeconds を carriedSeconds として引き継ぐ。
 */
export interface InterruptedQuest {
  id: string;
  taskId: string;
  /** このクエストでこれまでに作業した累計秒数（中断済みセグメントを含む） */
  elapsedSeconds: number;
  timerMode?: TimerMode;
  destinationId: string;
  assignedCharacterIds: string[];
  taskTitleSnapshot?: string;
  categoryIdSnapshot?: string;
  categoryNameSnapshot?: string;
  subCategoryIdSnapshot?: string;
  subCategoryNameSnapshot?: string;
  /** クエストを最初に開始した時刻（ISO 8601） */
  firstStartedAt: string;
  /** 最後に中断した時刻（ISO 8601） */
  interruptedAt: string;
  /** 最後に報酬を確定したセグメントのセッション ID */
  lastSessionId?: string;
}

/** 休憩セッションの状態 */
export type RestSessionState = 'active' | 'completed';

/** 作業後の休憩（キャラクターが促し、プレイヤーが時間を設定する） */
export interface RestSession {
  id: string;
  /** 休憩開始時刻（ISO 8601） */
  startedAt: string;
  /** プレイヤーが設定した休憩時間（分） */
  plannedMinutes: number;
  /** 休憩を促すきっかけになった作業セッション */
  sourceSessionId?: string;
  state: RestSessionState;
  /** 休憩完了時刻（ISO 8601） */
  endedAt?: string;
}

/** キャラクターの応援イベント種別 */
export type SupportEventKind = 'consecutive-work' | 'long-work' | 'rest-complete';

/** キャラクターからの応援・声かけイベント */
export interface SupportEvent {
  id: string;
  kind: SupportEventKind;
  characterId: string;
  message: string;
  createdAt: string;
  /** 関連する作業セッション（重複防止・文脈表示に使う） */
  workSessionId?: string;
  /** プレイヤーが確認済みか */
  seen: boolean;
}

/** 報酬の内訳 */
export interface RewardBundle {
  currency: number;
  materials: Partial<Record<MaterialId, number>>;
  experience: number;
}

/** 報酬レコード */
export interface RewardRecord {
  id: string;
  workSessionId: string;
  inputSummary: string;
  proposedReward: RewardBundle;
  /** 週間継続倍率を適用する前の確定報酬 */
  baseReward?: RewardBundle;
  /** 適用した週間継続倍率（未適用・旧データでは未設定） */
  rewardMultiplier?: number;
  finalReward: RewardBundle;
  reason: string;
  createdAt: string;
  status: RewardStatus;
}

/** キャラクター定義（マスタ） */
export interface CharacterDefinition {
  id: string;
  name: string;
  attribute: CharacterAttribute;
  baseEfficiency: number;
  description: string;
  /** 3D表示に使う GLB のパス。未設定なら仮モデルを表示する */
  modelUrl?: string;
}

/** 所持キャラクター（所有状態） */
export interface OwnedCharacter {
  definitionId: string;
  level: number;
  experience: number;
  /** レベル上限解放の段階。未設定は 0（初期上限）として扱う */
  ascensionStage?: number;
}

/** 収集先（戦闘先）定義 */
export interface Destination {
  id: string;
  name: string;
  description: string;
  /** 入手可能素材と比率（合計 1.0 になる想定だが検証で正規化する） */
  availableMaterials: Partial<Record<MaterialId, number>>;
  baseEfficiency: number;
  recommendedAttributes: CharacterAttribute[];
}

/** 施設タイプ */
export type FacilityType = 'currency' | 'material';

/** 施設定義（マスタ） */
export interface FacilityDefinition {
  id: string;
  name: string;
  type: FacilityType;
  description: string;
  baseProductionPerMinute: number;
  /** 仮：対象素材（material タイプのみ） */
  materialId?: MaterialId;
}

/** 所持施設（所有状態） */
export interface OwnedFacility {
  definitionId: string;
  level: number;
  enabled: boolean;
}

/** 所持資源 */
export interface Inventory {
  currency: number;
  materials: Record<MaterialId, number>;
}

export * from './inventory';
export * from './progression';
export * from './rewards';
export * from './taxonomy';
export * from './analytics';

/** 報酬・収集の計算入力 */
export interface WorkOutcomeInput {
  workMinutes: number;
  characters: OwnedCharacter[];
  /** 派遣したキャラクター。未指定の場合は所持キャラクター全員を対象にする */
  assignedCharacterIds?: string[];
  characterDefinitions: CharacterDefinition[];
  destination: Destination;
  facilities: OwnedFacility[];
  facilityDefinitions: FacilityDefinition[];
  completed: boolean;
}
