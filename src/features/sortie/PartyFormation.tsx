import { ATTRIBUTE_NAMES } from '../../domain/constants';
import { characterEfficiency } from '../../domain/collection';
import { CHARACTER_DEFINITIONS } from '../../data/seed';
import type { Destination, OwnedCharacter } from '../../types/index';
import { attributeClass, attributeGlyph } from '../companions/characterVisual';

interface PartyFormationProps {
  characters: OwnedCharacter[];
  selectedIds: string[];
  destination: Destination;
  onToggle: (definitionId: string) => void;
}

/** 派遣キャラクターの編成画面（編成枠＋所持キャラクター一覧） */
export function PartyFormation({
  characters,
  selectedIds,
  destination,
  onToggle,
}: PartyFormationProps) {
  const efficiencyById = new Map<string, number>();
  for (const owned of characters) {
    const definition = CHARACTER_DEFINITIONS.find((d) => d.id === owned.definitionId);
    if (definition === undefined) continue;
    efficiencyById.set(
      owned.definitionId,
      characterEfficiency(owned, definition, destination),
    );
  }

  const selected = selectedIds.flatMap((id) => {
    const owned = characters.find((c) => c.definitionId === id);
    return owned === undefined ? [] : [owned];
  });
  const totalEfficiency = selected.reduce(
    (sum, owned) => sum + (efficiencyById.get(owned.definitionId) ?? 0),
    0,
  );

  return (
    <section className="party-formation" aria-label="派遣キャラクター編成">
      <header className="party-formation__head">
        <div>
          <p className="party-formation__eyebrow">PARTY FORMATION</p>
          <h3 className="party-formation__title">派遣編成</h3>
        </div>
        <dl className="party-formation__stats">
          <div>
            <dt>編成人数</dt>
            <dd>{selected.length} 人</dd>
          </div>
          <div>
            <dt>収集効率</dt>
            <dd>{totalEfficiency.toFixed(1)}</dd>
          </div>
        </dl>
      </header>

      <div className="party-slots" aria-label="編成中のキャラクター">
        {selected.length === 0 ? (
          <p className="party-slots__empty">
            所持キャラクターから選んで、編成に追加してください。
          </p>
        ) : (
          selected.map((owned, index) => {
            const definition = CHARACTER_DEFINITIONS.find((d) => d.id === owned.definitionId);
            const name = definition?.name ?? owned.definitionId;
            const initial = name !== '' ? name.slice(0, 1) : '？';
            return (
              <button
                key={owned.definitionId}
                type="button"
                className={`party-slot ${attributeClass(definition?.attribute ?? 'none')}`}
                onClick={() => onToggle(owned.definitionId)}
                aria-label={`${name}を編成から外す`}
              >
                <span className="party-slot__index" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="party-slot__avatar" aria-hidden="true">
                  {initial}
                </span>
                <span className="party-slot__body">
                  <span className="party-slot__name">{name}</span>
                  <span className="party-slot__meta">
                    Lv.{owned.level} ／ 効率 {(efficiencyById.get(owned.definitionId) ?? 0).toFixed(1)}
                  </span>
                </span>
                <span className="party-slot__remove" aria-hidden="true">
                  ×
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="party-roster-head">
        <p className="party-roster__label">所持キャラクター</p>
        <p className="party-roster__hint">
          タップで編成に追加／解除。派遣先と属性が一致すると収集効率アップ。
        </p>
      </div>

      {characters.length === 0 ? (
        <p className="party-slots__empty">編成できるキャラクターがいません。</p>
      ) : (
        <div className="party-roster">
          {characters.map((owned) => {
            const definition = CHARACTER_DEFINITIONS.find((d) => d.id === owned.definitionId);
            const attribute = definition?.attribute ?? 'none';
            const name = definition?.name ?? owned.definitionId;
            const initial = name !== '' ? name.slice(0, 1) : '？';
            const isSelected = selectedIds.includes(owned.definitionId);
            const hasAffinity = destination.recommendedAttributes.includes(attribute);
            return (
              <button
                key={owned.definitionId}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${name}を編成${isSelected ? 'から外す' : 'に追加'}`}
                className={`party-card ${attributeClass(attribute)}${isSelected ? ' is-selected' : ''}`}
                onClick={() => onToggle(owned.definitionId)}
              >
                <span className="party-card__avatar" aria-hidden="true">
                  {initial}
                  <span className="party-card__glyph">{attributeGlyph(attribute)}</span>
                </span>
                <span className="party-card__body">
                  <span className="party-card__name">{name}</span>
                  <span className="party-card__meta">
                    Lv.{owned.level} ／ 効率{' '}
                    {(efficiencyById.get(owned.definitionId) ?? 0).toFixed(1)}
                  </span>
                  <span className="party-card__tags">
                    <span className="party-tag">{ATTRIBUTE_NAMES[attribute]}</span>
                    {hasAffinity && (
                      <span className="party-tag party-tag--affinity">相性◎</span>
                    )}
                    {isSelected && (
                      <span className="party-tag party-tag--selected">編成中</span>
                    )}
                  </span>
                </span>
                <span
                  className={`party-card__check${isSelected ? ' is-on' : ''}`}
                  aria-hidden="true"
                >
                  {isSelected ? '✓' : '＋'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
