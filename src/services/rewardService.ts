import { billableMinutes } from '../domain/session';
import { finalizeReward, proposeReward } from '../domain/reward';
import { BALANCE, WEEKLY_RULES } from '../domain/constants';
import { applyRewardMultiplier } from '../domain/weekly';
import { CHARACTER_DEFINITIONS, DESTINATIONS, FACILITY_DEFINITIONS } from '../data/seed';
import type {
  OwnedCharacter,
  OwnedFacility,
  RewardRecord,
  Task,
  WorkSession,
} from '../types/index';

/**
 * 報酬サービス。
 * 【仮実装】AI 報酬決定は未接続のため、domain の暫定ルールで報酬候補を生成し、
 * アプリ側で検証・確定する。AI 接続時はこのモジュール内に AI 呼び出しを追加し、
 * 失敗時は暫定ルールへフォールバックする設計にする（フロントから直接 AI を呼ばない）。
 */
export function getMasterData() {
  return {
    characterDefinitions: CHARACTER_DEFINITIONS,
    destinations: DESTINATIONS,
    facilityDefinitions: FACILITY_DEFINITIONS,
  };
}

export interface ComputeRewardArgs {
  session: WorkSession;
  task: Task | undefined;
  characters: OwnedCharacter[];
  facilities: OwnedFacility[];
  elapsedSec: number;
  nowIso: string;
  /** タスク完了時点で有効な週間継続倍率 */
  rewardMultiplier: number;
}

/** セッションの報酬レコードを生成する（検証済み・確定済み） */
export function computeSessionReward(args: ComputeRewardArgs): RewardRecord {
  const { session, task, characters, facilities, elapsedSec, nowIso, rewardMultiplier } = args;
  const minutes = billableMinutes(elapsedSec, BALANCE.minimumBillableSeconds);
  const destination =
    DESTINATIONS.find((d) => d.id === session.destinationId) ?? DESTINATIONS[0];
  const completed = session.result === 'completed';

  const { bundle, reason } = proposeReward({
    workMinutes: minutes,
    characters,
    characterDefinitions: CHARACTER_DEFINITIONS,
    destination,
    facilities,
    facilityDefinitions: FACILITY_DEFINITIONS,
    completed,
  });
  const baseReward = finalizeReward(bundle);
  const appliedMultiplier =
    completed && WEEKLY_RULES.rewardMultiplier.appliesToTaskCompletion
      ? Math.max(1, Number.isFinite(rewardMultiplier) ? rewardMultiplier : 1)
      : 1;
  const finalReward = finalizeReward(applyRewardMultiplier(baseReward, appliedMultiplier));

  const taskLabel = task !== undefined ? `「${task.title}」` : 'タスク';
  const multiplierLabel =
    appliedMultiplier > 1 ? ` / 週間継続倍率 ×${appliedMultiplier.toFixed(2)}` : '';
  return {
    id: `reward-${session.id}`,
    workSessionId: session.id,
    inputSummary: `${taskLabel} / ${minutes.toFixed(1)}分 / ${completed ? '完了' : '中断'} / ${destination.name}`,
    proposedReward: bundle,
    baseReward,
    rewardMultiplier: appliedMultiplier,
    finalReward,
    reason: `${reason}${multiplierLabel}`,
    createdAt: nowIso,
    status: 'approved',
  };
}
