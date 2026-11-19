import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { CHARACTER_DEFINITIONS } from '../../data/seed';
import { useAppStore } from '../../stores/appStore';
import { CharacterSelector } from './CharacterSelector';
import { CharacterShowcase } from './CharacterShowcase';
import { CharacterStatusPanel } from './CharacterStatusPanel';

interface CompanionsLocationState {
  selectedId?: string;
}

function getInitialSelectedId(state: unknown, definitionIds: string[]): string | null {
  if (typeof state === 'object' && state !== null) {
    const selectedId = (state as CompanionsLocationState).selectedId;
    if (typeof selectedId === 'string' && definitionIds.includes(selectedId)) {
      return selectedId;
    }
  }
  return null;
}

/** キャラクター画面。一覧から詳細ステータスを確認する。 */
export function CompanionsPage() {
  const characters = useAppStore((s) => s.characters);
  const inventory = useAppStore((s) => s.inventory);
  const itemInventory = useAppStore((s) => s.itemInventory);
  const levelUpCharacter = useAppStore((s) => s.levelUpCharacter);
  const ascendCharacter = useAppStore((s) => s.ascendCharacter);
  const location = useLocation();

  // 選択状態はこの画面内の状態に留め、正規データとして扱わない。
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    getInitialSelectedId(
      location.state,
      characters.map((c) => c.definitionId),
    ),
  );
  const owned = characters.find((c) => c.definitionId === selectedId) ?? null;
  const definition =
    owned !== null
      ? (CHARACTER_DEFINITIONS.find((d) => d.id === owned.definitionId) ?? undefined)
      : undefined;

  return (
    <div className="game-screen">
      <div className="game-container companion">
        {owned === null ? (
          <>
            <h1 className="companion-title">キャラクター</h1>
            {characters.length === 0 ? (
              <Card title="キャラクターがいません">
                <p className="list-item__meta">
                  所持キャラクターがいません。育成やホーム画面からキャラクターを増やしましょう。
                </p>
              </Card>
            ) : (
              <>
                <p className="list-item__meta companion-lead">
                  キャラクターを選ぶとステータス画面が開きます。
                </p>
                <div className="companion-layout companion-layout--list">
                  <CharacterSelector
                    characters={characters}
                    selectedId={null}
                    onSelect={setSelectedId}
                  />
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="game-screen__head">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setSelectedId(null)}
              >
                ← キャラクター一覧に戻る
              </button>
            </div>
            <div className="companion-layout companion-layout--detail">
              <CharacterShowcase definition={definition} owned={owned} />
              <CharacterStatusPanel
                definition={definition}
                owned={owned}
                currency={inventory.currency}
                itemInventory={itemInventory}
                onLevelUp={levelUpCharacter}
                onAscend={ascendCharacter}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
