// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ItemInventory, OwnedCharacter } from '@tasmate/types';
import { CHARACTER_DEFINITIONS } from '../src/data/seed';
import { CharacterStatusPanel } from '../src/features/companions/CharacterStatusPanel';

const definition = CHARACTER_DEFINITIONS[0];
const itemInventory: ItemInventory = {};
const AUTO_LEVEL_NOTE = '経験値が貯まると自動でレベルアップします。';

function renderPanel(owned: OwnedCharacter) {
  return render(
    <CharacterStatusPanel
      definition={definition}
      owned={owned}
      currency={0}
      itemInventory={itemInventory}
      onLevelUp={() => true}
      onAscend={() => true}
    />,
  );
}

afterEach(cleanup);

describe('CharacterStatusPanel の自動レベルアップ案内', () => {
  it('上限未満では案内を表示する', () => {
    renderPanel({ definitionId: definition.id, level: 1, experience: 0 });

    expect(screen.queryByText(AUTO_LEVEL_NOTE)).not.toBeNull();
  });

  it('上限レベルでは案内を表示しない', () => {
    renderPanel({ definitionId: definition.id, level: 20, experience: 2500, ascensionStage: 0 });

    expect(screen.queryByText(AUTO_LEVEL_NOTE)).toBeNull();
  });
});
