import type { MaterialId, RewardBundle, WorkOutcomeInput } from '../types/index';
import { BALANCE } from './constants';
import { calculateCollection } from './collection';
import { calculateFacilityProduction } from './facility';

/**
 * 報酬決定ロジック。
 *
 * 【仮実装】 docs/02_game_design.md のとおり AI 報酬決定は詳細未定のため、
 * MVP では固定ルールによる暫定報酬を返す。AI 接続は後続フェーズで
 * src/services/ 経由に差し替える。rewardService がこの関数を呼び出す。
 */

export interface ProposedReward {
  bundle: RewardBundle;
  reason: string;
}

/** 既知の素材 ID かを検証する */
const KNOWN_MATERIALS: ReadonlySet<string> = new Set<string>(['shard_sun', 'shard_moon', 'shard_star']);

function sanitizeMaterials(
  materials: Partial<Record<MaterialId, number>>,
): Partial<Record<MaterialId, number>> {
  const result: Partial<Record<MaterialId, number>> = {};
  for (const [key, value] of Object.entries(materials)) {
    if (!KNOWN_MATERIALS.has(key)) continue;
    if (!Number.isFinite(value)) continue;
    const clamped = Math.max(0, Math.min(BALANCE.maxMaterialPerSession, Math.floor(value as number)));
    if (clamped > 0) result[key as MaterialId] = clamped;
  }
  return result;
}

/**
 * 報酬候補を生成する（暫定ルール）。
 * - 通貨 = 作業分 × 単価（上限でクランプ）
 * - 素材 = 収集結果 + 施設生産（素材分）
 * - 経験値 = 作業分 × 単価
 * - 中断時は係数を掛ける（0にはしない）
 */
export function proposeReward(input: WorkOutcomeInput): ProposedReward {
  const minutes = Number.isFinite(input.workMinutes) ? Math.max(0, input.workMinutes) : 0;
  const factor = input.completed ? 1 : BALANCE.interruptedRewardFactor;

  const collection = calculateCollection(
    minutes,
    input.characters,
    input.characterDefinitions,
    input.destination,
    input.assignedCharacterIds,
  );
  const production = calculateFacilityProduction(minutes, input.facilities, input.facilityDefinitions);

  const rawCurrency =
    Math.floor(minutes * BALANCE.currencyPerMinute * factor) + Math.floor(production.currency * factor);
  const currency = Math.max(0, Math.min(BALANCE.maxCurrencyPerSession, rawCurrency));

  const merged: Partial<Record<MaterialId, number>> = { ...collection };
  for (const [key, value] of Object.entries(production.materials)) {
    const id = key as MaterialId;
    merged[id] = (merged[id] ?? 0) + Math.floor((value ?? 0) * factor);
  }
  // 中断時は収集分にも係数を適用する
  if (!input.completed) {
    for (const key of Object.keys(merged) as MaterialId[]) {
      merged[key] = Math.floor((merged[key] ?? 0) * factor);
      if ((merged[key] ?? 0) <= 0) delete merged[key];
    }
  }
  const materials = sanitizeMaterials(merged);
  const experience = Math.floor(minutes * BALANCE.experiencePerMinute * factor);

  const reason = input.completed
    ? `作業 ${minutes.toFixed(1)} 分の取り組みに対する暫定報酬（ルールベース・AI未接続）`
    : `中断時の暫定報酬（作業 ${minutes.toFixed(1)} 分 × 係数 ${factor}）`;

  return { bundle: { currency, materials, experience }, reason };
}

/**
 * 報酬を検証・確定する。
 * - 形式・範囲・既知IDを検証し、上限超過はクランプする
 * - 呼び出し側はセッションID単位の二重付与防止を別途行うこと
 */
export function finalizeReward(proposed: RewardBundle): RewardBundle {
  const currency = Number.isFinite(proposed.currency)
    ? Math.max(0, Math.min(BALANCE.maxCurrencyPerSession, Math.floor(proposed.currency)))
    : 0;
  const experience = Number.isFinite(proposed.experience)
    ? Math.max(0, Math.floor(proposed.experience))
    : 0;
  return { currency, materials: sanitizeMaterials(proposed.materials), experience };
}

/** キャラのレベルアップ費用（通貨） */
export function levelUpCost(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  return lv * BALANCE.levelUpCostPerLevel;
}

/** レベルアップに必要な累積経験値の閾値（Lv→Lv+1） */
export function experienceToNextLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  return lv * BALANCE.experiencePerLevel;
}
