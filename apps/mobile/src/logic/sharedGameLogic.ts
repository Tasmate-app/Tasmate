import { BALANCE, getMasterData, proposeReward } from '@tasmate/core';
import type { OwnedCharacter, WorkOutcomeInput } from '@tasmate/types';

/**
 * Phase C の共有パッケージ利用確認用。
 * Web版と同じ報酬ロジックを Native 側から呼び出せることを示す。
 */
const { characterDefinitions, destinations, facilityDefinitions } = getMasterData();

export interface RewardPreview {
  currency: number;
  experience: number;
  materials: number;
}

export function previewReward(workMinutes: number): RewardPreview {
  const character = characterDefinitions[0];
  const destination = destinations[0];
  const ownedCharacters: OwnedCharacter[] = [
    { definitionId: character.id, level: 1, experience: 0 },
  ];
  const input: WorkOutcomeInput = {
    workMinutes,
    characters: ownedCharacters,
    assignedCharacterIds: [character.id],
    characterDefinitions,
    destination,
    facilities: [],
    facilityDefinitions,
    completed: true,
  };
  const { bundle } = proposeReward(input);
  const materials = Object.values(bundle.materials).reduce(
    (sum, amount) => sum + (amount ?? 0),
    0,
  );
  return { currency: bundle.currency, experience: bundle.experience, materials };
}

export const SHARED_RULE_LABEL = `通貨 ${BALANCE.currencyPerMinute}/分`;
