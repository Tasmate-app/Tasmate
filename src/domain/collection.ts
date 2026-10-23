import type {
  CharacterAttribute,
  CharacterDefinition,
  Destination,
  MaterialId,
  OwnedCharacter,
} from '../types/index';
import { BALANCE } from './constants.js';

/**
 * キャラ1人の収集効率を算出する純粋関数。
 * 効率 = 基本効率 × (1 + (Lv-1) × 上昇率) × 相性倍率
 */
export function characterEfficiency(
  character: OwnedCharacter,
  definition: CharacterDefinition,
  destination: Destination,
): number {
  const levelFactor = 1 + Math.max(0, character.level - 1) * BALANCE.efficiencyPerLevel;
  const affinity: boolean = destination.recommendedAttributes.includes(definition.attribute);
  const affinityFactor = affinity ? BALANCE.affinityBonus : 1;
  return definition.baseEfficiency * levelFactor * affinityFactor;
}

/** 収集結果（素材ごとの数量。小数は切り捨て前の理論値） */
export type CollectionResult = Partial<Record<MaterialId, number>>;

/**
 * 作業時間に応じた素材収集量を算出する。
 * - characterDefinitions に存在しないキャラは無視する（不正データ耐性）
 * - destination.availableMaterials の比率合計が 0 の場合は空を返す
 * - 負数・NaN の作業時間は 0 として扱う
 *
 * @param workMinutes 実作業時間（分）
 */
export function calculateCollection(
  workMinutes: number,
  characters: OwnedCharacter[],
  characterDefinitions: CharacterDefinition[],
  destination: Destination,
  assignedCharacterIds?: string[],
): CollectionResult {
  const minutes = Number.isFinite(workMinutes) ? Math.max(0, workMinutes) : 0;
  if (minutes <= 0) return {};

  const defMap = new Map(characterDefinitions.map((d) => [d.id, d]));
  const targets =
    assignedCharacterIds !== undefined
      ? characters.filter((c) => assignedCharacterIds.includes(c.definitionId))
      : characters;
  if (targets.length === 0) return {};

  let totalEfficiency = 0;
  for (const owned of targets) {
    const def = defMap.get(owned.definitionId);
    if (def === undefined) continue;
    // 属性は定義側を正とし、所有側に属性があれば定義を上書きしない（定義が正）
    const attribute: CharacterAttribute = def.attribute;
    totalEfficiency += characterEfficiency(owned, { ...def, attribute }, destination);
  }
  if (totalEfficiency <= 0) return {};

  const baseAmount = minutes * BALANCE.materialPerMinute * totalEfficiency * destination.baseEfficiency;

  const entries = Object.entries(destination.availableMaterials) as Array<[MaterialId, number | undefined]>;
  const ratioSum = entries.reduce((sum, [, ratio]) => sum + Math.max(0, ratio ?? 0), 0);
  if (ratioSum <= 0) return {};

  const result: CollectionResult = {};
  for (const [materialId, ratio] of entries) {
    const safeRatio = Math.max(0, ratio ?? 0);
    if (safeRatio <= 0) continue;
    const amount = Math.floor((baseAmount * safeRatio) / ratioSum);
    if (amount > 0) result[materialId] = amount;
  }
  return result;
}
