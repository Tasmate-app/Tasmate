import { CHARACTER_DEFINITIONS, characterEfficiency } from '@tasmate/core';
import type { Destination, OwnedCharacter } from '@tasmate/types';

export function partyEfficiencyMap(
  characters: OwnedCharacter[],
  destination: Destination,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const owned of characters) {
    const definition = CHARACTER_DEFINITIONS.find((item) => item.id === owned.definitionId);
    if (definition === undefined) continue;
    map.set(owned.definitionId, characterEfficiency(owned, definition, destination));
  }
  return map;
}

export function partyTotalEfficiency(
  efficiencyById: Map<string, number>,
  selectedIds: string[],
): number {
  return selectedIds.reduce((sum, id) => sum + (efficiencyById.get(id) ?? 0), 0);
}
