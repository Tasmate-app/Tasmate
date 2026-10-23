import { ATTRIBUTE_NAMES } from '../../domain/constants';
import { CHARACTER_DEFINITIONS } from '../../data/seed';
import type { OwnedCharacter } from '../../types/index';
import { attributeClass, attributeGlyph } from './characterVisual';

interface CharacterSelectorProps {
  characters: OwnedCharacter[];
  selectedId: string | null;
  onSelect: (definitionId: string) => void;
}

/** キャラクター選択エリア（左側・縦サムネイル一覧） */
export function CharacterSelector({ characters, selectedId, onSelect }: CharacterSelectorProps) {
  return (
    <div className="companion-select" role="group" aria-label="キャラクター選択">
      {characters.map((c) => {
        const def = CHARACTER_DEFINITIONS.find((d) => d.id === c.definitionId);
        const selected = c.definitionId === selectedId;
        const initial = def?.name !== undefined && def.name !== '' ? def.name.slice(0, 1) : '？';
        return (
          <button
            key={c.definitionId}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(c.definitionId)}
            className={`companion-thumb${selected ? ' is-selected' : ''} ${attributeClass(def?.attribute ?? 'none')}`}
          >
            <span className="companion-thumb__avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="companion-thumb__info">
              <span className="companion-thumb__name">{def?.name ?? c.definitionId}</span>
              <span className="companion-thumb__meta">
                Lv.{c.level} ／ {attributeGlyph(def?.attribute ?? 'none')}
                {ATTRIBUTE_NAMES[def?.attribute ?? 'none']}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
