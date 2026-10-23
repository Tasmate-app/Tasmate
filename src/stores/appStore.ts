import { create } from 'zustand';
import { elapsedSeconds } from '../domain/session';
import { experienceToNextLevel, levelUpCost } from '../domain/reward';
import { facilityUpgradeCost } from '../domain/facility';
import { initialAppState, type AppState } from '../services/appState';
import { loadAppState, saveAppState } from '../services/storage';
import { computeSessionReward } from '../services/rewardService';
import type { SessionResult, Task, WorkSession } from '../types/index';

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

interface TaskInput {
  title: string;
  description: string;
  category: string;
  subject?: string;
  estimatedMinutes: number;
  scheduledAt?: string;
}

interface AppActions {
  createTask: (input: TaskInput) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  startSession: (taskId: string, destinationId: string, characterIds: string[]) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  /** セッションを終了し報酬を確定する。戻り値は確定した報酬レコードの ID（報酬なしの場合 null） */
  finishSession: (result: SessionResult) => string | null;
  cancelSession: () => void;

  levelUpCharacter: (definitionId: string) => boolean;
  upgradeFacility: (definitionId: string) => boolean;
  toggleFacility: (definitionId: string) => void;

  resetAll: () => void;
}

type AppStore = AppState & AppActions;

/** 現在のセッションの経過秒数を算出するセレクタ用ヘルパー */
export function sessionElapsedSeconds(session: WorkSession | null, nowMs: number): number {
  if (session === null) return 0;
  return elapsedSeconds(
    Date.parse(session.startedAt),
    session.accumulatedSeconds,
    session.pausedAt !== undefined ? Date.parse(session.pausedAt) : undefined,
    nowMs,
  );
}

const persisted = loadAppState();

export const useAppStore = create<AppStore>()((set, get) => ({
  ...persisted,

  createTask: (input) => {
    const timestamp = nowIso();
    const title = input.title.trim();
    if (title.length === 0) return;
    const task: Task = {
      id: newId('task'),
      title,
      description: input.description.trim(),
      category: input.category.trim() === '' ? '勉強' : input.category.trim(),
      subject: input.subject?.trim() === '' ? undefined : input.subject?.trim(),
      estimatedMinutes: Math.max(1, Math.floor(input.estimatedMinutes) || 25),
      scheduledAt: input.scheduledAt,
      status: 'planned',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((s) => ({ tasks: [task, ...s.tasks] }));
  },

  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t)),
    })),

  deleteTask: (id) =>
    set((s) => ({
      // 進行中セッションのタスクは削除不可
      tasks: s.activeSession?.taskId === id ? s.tasks : s.tasks.filter((t) => t.id !== id),
    })),

  startSession: (taskId, destinationId, characterIds) => {
    const { activeSession, tasks } = get();
    if (activeSession !== null) return; // 同時進行は1件まで（仮仕様）
    const task = tasks.find((t) => t.id === taskId);
    if (task === undefined) return;
    if (characterIds.length === 0) return;
    const session: WorkSession = {
      id: newId('session'),
      taskId,
      startedAt: nowIso(),
      accumulatedSeconds: 0,
      pausedAt: undefined,
      state: 'running',
      destinationId,
      assignedCharacterIds: characterIds,
    };
    set((s) => ({
      activeSession: session,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: 'active' as const } : t)),
    }));
  },

  pauseSession: () => {
    const { activeSession } = get();
    if (activeSession === null || activeSession.state !== 'running') return;
    set({ activeSession: { ...activeSession, state: 'paused', pausedAt: nowIso() } });
  },

  resumeSession: () => {
    const { activeSession } = get();
    if (activeSession === null || activeSession.state !== 'paused') return;
    const pausedMs = activeSession.pausedAt !== undefined ? Date.parse(activeSession.pausedAt) : NaN;
    const startedMs = Date.parse(activeSession.startedAt);
    const additional = Number.isFinite(pausedMs) ? Math.max(0, (pausedMs - startedMs) / 1000) : 0;
    set({
      activeSession: {
        ...activeSession,
        state: 'running',
        startedAt: nowIso(),
        accumulatedSeconds: activeSession.accumulatedSeconds + additional,
        pausedAt: undefined,
      },
    });
  },

  finishSession: (result) => {
    const s = get();
    const { activeSession } = s;
    if (activeSession === null) return null;
    // 二重完了防止：同一セッションへの再確定を防ぐ
    if (s.appliedRewardSessionIds.includes(activeSession.id)) {
      set({ activeSession: null });
      return null;
    }
    const nowMs = Date.now();
    const elapsed = sessionElapsedSeconds(activeSession, nowMs);
    const endedAt = new Date(nowMs).toISOString();
    const finished: WorkSession = {
      ...activeSession,
      state: 'idle',
      result,
      endedAt,
    };
    const task = s.tasks.find((t) => t.id === activeSession.taskId);
    const record = computeSessionReward({
      session: finished,
      task,
      characters: s.characters,
      facilities: s.facilities,
      elapsedSec: elapsed,
      nowIso: endedAt,
    });

    // 報酬付与：通貨・素材・経験値
    const gainedExp = record.finalReward.experience;
    const dispatched = new Set(activeSession.assignedCharacterIds);
    set((prev) => ({
      activeSession: null,
      sessionHistory: [finished, ...prev.sessionHistory],
      tasks: prev.tasks.map((t) =>
        t.id === activeSession.taskId
          ? {
              ...t,
              status: result === 'completed' ? ('completed' as const) : ('planned' as const),
              updatedAt: endedAt,
            }
          : t,
      ),
      inventory: {
        currency: prev.inventory.currency + record.finalReward.currency,
        materials: {
          shard_sun:
            prev.inventory.materials.shard_sun + (record.finalReward.materials.shard_sun ?? 0),
          shard_moon:
            prev.inventory.materials.shard_moon + (record.finalReward.materials.shard_moon ?? 0),
          shard_star:
            prev.inventory.materials.shard_star + (record.finalReward.materials.shard_star ?? 0),
        },
      },
      characters: prev.characters.map((c) =>
        dispatched.has(c.definitionId) ? { ...c, experience: c.experience + gainedExp } : c,
      ),
      rewards: [record, ...prev.rewards],
      appliedRewardSessionIds: [...prev.appliedRewardSessionIds, activeSession.id],
    }));
    return record.id;
  },

  cancelSession: () => {
    const { activeSession } = get();
    if (activeSession === null) return;
    set((s) => ({
      activeSession: null,
      tasks: s.tasks.map((t) =>
        t.id === activeSession.taskId && t.status === 'active'
          ? { ...t, status: 'planned' as const, updatedAt: nowIso() }
          : t,
      ),
    }));
  },

  levelUpCharacter: (definitionId) => {
    const s = get();
    const owned = s.characters.find((c) => c.definitionId === definitionId);
    if (owned === undefined) return false;
    const cost = levelUpCost(owned.level);
    if (s.inventory.currency < cost) return false;
    if (owned.experience < experienceToNextLevel(owned.level)) return false;
    set((prev) => ({
      inventory: { ...prev.inventory, currency: prev.inventory.currency - cost },
      characters: prev.characters.map((c) =>
        c.definitionId === definitionId
          ? {
              ...c,
              level: c.level + 1,
              experience: c.experience - experienceToNextLevel(c.level),
            }
          : c,
      ),
    }));
    return true;
  },

  upgradeFacility: (definitionId) => {
    const s = get();
    const owned = s.facilities.find((f) => f.definitionId === definitionId);
    if (owned === undefined) return false;
    const cost = facilityUpgradeCost(owned.level);
    if (s.inventory.currency < cost) return false;
    set((prev) => ({
      inventory: { ...prev.inventory, currency: prev.inventory.currency - cost },
      facilities: prev.facilities.map((f) =>
        f.definitionId === definitionId ? { ...f, level: f.level + 1 } : f,
      ),
    }));
    return true;
  },

  toggleFacility: (definitionId) =>
    set((s) => ({
      facilities: s.facilities.map((f) =>
        f.definitionId === definitionId ? { ...f, enabled: !f.enabled } : f,
      ),
    })),

  resetAll: () => set({ ...initialAppState() }),
}));

// 永続化：ストアの状態変更をサービス層経由で保存する
useAppStore.subscribe((state) => {
  const snapshot: AppState = {
    version: 1,
    tasks: state.tasks,
    activeSession: state.activeSession,
    sessionHistory: state.sessionHistory,
    inventory: state.inventory,
    characters: state.characters,
    facilities: state.facilities,
    rewards: state.rewards,
    appliedRewardSessionIds: state.appliedRewardSessionIds,
  };
  saveAppState(snapshot);
});
