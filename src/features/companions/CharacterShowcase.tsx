import { ATTRIBUTE_NAMES } from '../../domain/constants';
import type { CharacterDefinition, OwnedCharacter } from '../../types/index';
import { attributeClass, attributeGlyph } from './characterVisual';

interface CharacterShowcaseProps {
  definition: CharacterDefinition | undefined;
  owned: OwnedCharacter | undefined;
}

/** メインキャラクターエリア（中央・選択キャラの大きな表示） */
export function CharacterShowcase({ definition, owned }: CharacterShowcaseProps) {
  if (definition === undefined || owned === undefined) {
    return (
      <section className="companion-showcase" aria-label="キャラクター表示">
        <p className="list-item__meta">キャラクターデータが見つかりません。</p>
      </section>
    );
  }

  const initial = definition.name !== '' ? definition.name.slice(0, 1) : '？';

  return (
    <section className={`companion-showcase ${attributeClass(definition.attribute)}`} aria-label={`${definition.name}の表示`}>
      <div className="companion-showcase__figure" aria-hidden="true">
        <span className="companion-showcase__glyph">{attributeGlyph(definition.attribute)}</span>
        <span className="companion-showcase__initial">{initial}</span>
      </div>
      <div className="companion-showcase__caption">
        <p className="companion-showcase__attr">
          {attributeGlyph(definition.attribute)} {ATTRIBUTE_NAMES[definition.attribute]} ／ Lv.
          {owned.level}
        </p>
        <h2 className="companion-showcase__name">{definition.name}</h2>
        <p className="companion-showcase__desc">{definition.description}</p>
      </div>
    </section>
  );
}
