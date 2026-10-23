import type {
  Inventory,
  OwnedCharacter,
  OwnedFacility,
  RewardRecord,
  Task,
  WorkSession,
} from '../types/index';

/**
 * 永続化されるアプリ全体の状態。
 * UI はこの状態へ直接触らず、必ず src/stores/ のアクション経由で更新する。
 * 保存の実体（localStorage）は src/services/storage.ts に隔離する。
 */
export interface AppState {
  version: 1;
  tasks: Task[];
  /** 進行中・一時停止中のセッション（同時に1件まで・仮仕様） */
  activeSession: WorkSession | null;
  sessionHistory: WorkSession[];
  inventory: Inventory;
  characters: OwnedCharacter[];
  facilities: OwnedFacility[];
  rewards: RewardRecord[];
  /** 報酬付与済みセッション ID（二重付与防止） */
  appliedRewardSessionIds: string[];
}

/** 初期状態（仮データ） */
export function initialAppState(): AppState {
  return {
    version: 1,
    tasks: [],
    activeSession: null,
    sessionHistory: [],
    inventory: {
      currency: 100,
      materials: { shard_sun: 0, shard_moon: 0, shard_star: 0 },
    },
    characters: [
      { definitionId: 'c-hinata', level: 1, experience: 0 },
      { definitionId: 'c-luna', level: 1, experience: 0 },
    ],
    facilities: [
      { definitionId: 'f-coin', level: 1, enabled: true },
      { definitionId: 'f-star', level: 1, enabled: true },
    ],
    rewards: [],
    appliedRewardSessionIds: [],
  };
}

/** 保存データの簡易検証（破損データから起動不能になるのを防ぐ） */
export function isValidAppState(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v['version'] === 1 &&
    Array.isArray(v['tasks']) &&
    Array.isArray(v['sessionHistory']) &&
    typeof v['inventory'] === 'object' &&
    Array.isArray(v['characters']) &&
    Array.isArray(v['facilities']) &&
    Array.isArray(v['rewards']) &&
    Array.isArray(v['appliedRewardSessionIds'])
  );
}
