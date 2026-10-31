import { describe, expect, it } from 'vitest';
import { getMasterData, multiplierForStreak, proposeReward } from '@tasmate/core';
import type { OwnedCharacter, WorkOutcomeInput } from '@tasmate/types';

describe('shared core package', () => {
  it('proposes the same deterministic reward as the web implementation', () => {
    const { characterDefinitions, destinations, facilityDefinitions } = getMasterData();
    const character = characterDefinitions[0];
    const owned: OwnedCharacter[] = [{ definitionId: character.id, level: 1, experience: 0 }];
    const input: WorkOutcomeInput = {
      workMinutes: 10,
      characters: owned,
      assignedCharacterIds: [character.id],
      characterDefinitions,
      destination: destinations[0],
      facilities: [],
      facilityDefinitions,
      completed: true,
    };

    const { bundle } = proposeReward(input);

    expect(bundle.currency).toBe(100);
    expect(bundle.experience).toBe(50);
    expect(bundle.materials).toEqual({ shard_sun: 5, shard_star: 2 });
  });

  it('exposes weekly multiplier rules', () => {
    expect(multiplierForStreak(0)).toBe(1);
    expect(multiplierForStreak(2)).toBe(1.1);
    expect(multiplierForStreak(8)).toBe(1.75);
  });
});
