/**
 * 共有型定義（MVP）。
 * docs/04_data_design.md の概念モデルに対応する。
 * 時刻は ISO 8601 文字列（UTC）で保存し、表示時にローカル時刻へ変換する。
 */

/** タスクの状態 */
export type TaskStatus = 'planned' | 'active' | 'completed' | 'cancelled';

/** 作業セッションの結果 */
export type SessionResult = 'completed' | 'interrupted';

/** 作業セッションの状態（タイマー状態機械） */
export type WorkSessionState = 'idle' | 'running' | 'paused';

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
  category: string;
  subject?: string;
  estimatedMinutes: number;
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
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  /** 削除日時。論理削除し、過去の週次判定を壊さない */
  archivedAt?: string;
}

/** 繰り返しタスクのルール（初期対応は週次） */
export interface RecurrenceRule {
  id: string;
  title: string;
  description: string;
  category: string;
  subject?: string;
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
  endedAt?: string;
  /** 一時停止中に蓄積された作業秒数（一時停止→再開で加算） */
  accumulatedSeconds: number;
  /** 一時停止した時刻（running 中は undefined） */
  pausedAt?: string;
  state: WorkSessionState;
  result?: SessionResult;
  destinationId: string;
  assignedCharacterIds: string[];
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
}

/** 所持キャラクター（所有状態） */
export interface OwnedCharacter {
  definitionId: string;
  level: number;
  experience: number;
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

/** 報酬・収集の計算入力 */
export interface WorkOutcomeInput {
  workMinutes: number;
  characters: OwnedCharacter[];
  characterDefinitions: CharacterDefinition[];
  destination: Destination;
  facilities: OwnedFacility[];
  facilityDefinitions: FacilityDefinition[];
  completed: boolean;
}
