import { useState } from 'react';
import { ATTRIBUTE_NAMES } from '../../domain/constants';
import { experienceToNextLevel, levelUpCost } from '../../domain/reward';
import { DESTINATIONS } from '../../data/seed';
import type { CharacterDefinition, OwnedCharacter } from '../../types/index';
import { attributeGlyph } from './characterVisual';

interface CharacterStatusPanelProps {
  definition: CharacterDefinition | undefined;
  owned: OwnedCharacter | undefined;
  currency: number;
  onLevelUp: (definitionId: string) => boolean;
}

/** ステータスパネル（右側・能力と育成操作を整理して表示） */
export function CharacterStatusPanel({ definition, owned, currency, onLevelUp }: CharacterStatusPanelProps) {
  const [pending, setPending] = useState(false);

  if (definition === undefined || owned === undefined) {
    return (
      <section className="companion-status" aria-label="ステータス">
        <p className="list-item__meta">キャラクターデータが見つかりません。</p>
      </section>
    );
  }

  const cost = levelUpCost(owned.level);
  const need = experienceToNextLevel(owned.level);
  const canAfford = currency >= cost;
  const hasExp = owned.experience >= need;
  const canLevelUp = canAfford && hasExp;
  const expPercent = need > 0 ? Math.min(100, Math.round((owned.experience / need) * 100)) : 0;
  const affinity = DESTINATIONS.filter((d) => d.recommendedAttributes.includes(definition.attribute));

  const handleLevelUp = () => {
    if (pending || !canLevelUp) return;
    setPending(true);
    try {
      onLevelUp(owned.definitionId);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="companion-status" aria-label={`${definition.name}のステータス`}>
      {/* 1. キャラクター名とレベル */}
      <div className="companion-status__header">
        <h2 className="companion-status__name">{definition.name}</h2>
        <p className="companion-status__level" key={owned.level}>
          Lv.{owned.level}
        </p>
      </div>

      {/* 2. 経験値と進捗バー */}
      <div className="companion-status__exp">
        <p className="companion-status__label">
          経験値 {owned.experience} / {need}
        </p>
        <div
          className="progress companion-exp"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={need}
          aria-valuenow={Math.min(owned.experience, need)}
          aria-label="次のレベルまでの経験値"
        >
          <div className="progress__bar" style={{ width: `${expPercent}%` }} />
        </div>
      </div>

      {/* 3. 基本情報 */}
      <dl className="companion-status__rows">
        <div>
          <dt>属性</dt>
          <dd>
            {attributeGlyph(definition.attribute)} {ATTRIBUTE_NAMES[definition.attribute]}
          </dd>
        </div>
        <div>
          <dt>レベル</dt>
          <dd>{owned.level}</dd>
        </div>
        <div>
          <dt>所持通貨</dt>
          <dd>{currency}</dd>
        </div>
      </dl>

      {/* 4. 作業・ゲーム内での効率（既存データから算出できる範囲のみ） */}
      <div className="companion-status__efficiency">
        <p className="companion-status__label">収集効率（基礎値）</p>
        <p className="companion-status__efficiency-value">{definition.baseEfficiency.toFixed(1)}</p>
        {affinity.length > 0 && (
          <p className="list-item__meta">
            相性の良い探索先：{affinity.map((d) => d.name).join('、')}
          </p>
        )}
      </div>

      {/* 5. キャラクターの説明や特性 */}
      <p className="companion-status__desc">{definition.description}</p>

      {/* 6. 育成アクション */}
      <div className="companion-status__action">
        <button
          type="button"
          className="btn companion-levelup"
          disabled={!canLevelUp || pending}
          onClick={handleLevelUp}
        >
          {pending ? 'レベルアップ中…' : `レベルアップ（通貨 ${cost}）`}
        </button>
        {!canLevelUp && (
          <p className="list-item__meta" role="status">
            {!canAfford
              ? '通貨が足りません。作業して報酬を集めましょう。'
              : '経験値が足りません。キャラを派遣して作業しましょう。'}
          </p>
        )}
      </div>
    </section>
  );
}
