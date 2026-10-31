import type { FacilityDefinition, OwnedFacility } from '@tasmate/types';
import { BALANCE } from './constants';

/** 施設生産結果 */
export interface FacilityProduction {
  currency: number;
  materials: Partial<Record<string, number>>;
}

/**
 * 作業時間に応じた施設生産量を算出する純粋関数。
 * - enabled でない施設・定義不明の施設は無視する
 * - 作業中のみ稼働する前提（呼び出し側が作業時間を渡す）
 * - 負数・NaN の作業時間は 0 として扱う
 */
export function calculateFacilityProduction(
  workMinutes: number,
  facilities: OwnedFacility[],
  facilityDefinitions: FacilityDefinition[],
): FacilityProduction {
  const minutes = Number.isFinite(workMinutes) ? Math.max(0, workMinutes) : 0;
  const result: FacilityProduction = { currency: 0, materials: {} };
  if (minutes <= 0) return result;

  const defMap = new Map(facilityDefinitions.map((d) => [d.id, d]));
  for (const owned of facilities) {
    if (!owned.enabled) continue;
    const def = defMap.get(owned.definitionId);
    if (def === undefined) continue;
    const levelFactor = 1 + Math.max(0, owned.level - 1) * BALANCE.facilityPerLevel;
    const amount = Math.floor(
      minutes * def.baseProductionPerMinute * levelFactor * BALANCE.facilityProductionFactor,
    );
    if (amount <= 0) continue;
    if (def.type === 'currency') {
      result.currency += amount;
    } else if (def.type === 'material' && def.materialId !== undefined) {
      result.materials[def.materialId] = (result.materials[def.materialId] ?? 0) + amount;
    }
  }
  return result;
}

/** 施設強化費用（通貨）を算出する。Lv→Lv+1 の費用 */
export function facilityUpgradeCost(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  return lv * BALANCE.facilityUpgradeCostPerLevel;
}
