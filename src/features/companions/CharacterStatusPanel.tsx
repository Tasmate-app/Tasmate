import { useState } from 'react';
import { getItemDefinition, planAscension, planLevelUp } from '@tasmate/core';
import type { ItemInventory, ItemStack } from '@tasmate/types';
import { ATTRIBUTE_NAMES } from '../../domain/constants';
import { DESTINATIONS } from '../../data/seed';
import type { CharacterDefinition, OwnedCharacter } from '../../types/index';
import { attributeGlyph } from './characterVisual';

interface CharacterStatusPanelProps {
  definition: CharacterDefinition | undefined;
  owned: OwnedCharacter | undefined;
  currency: number;
  itemInventory: ItemInventory;
  onLevelUp: (definitionId: string) => boolean;
  onAscend: (definitionId: string) => boolean;
}

function stackLabel(stack: ItemStack): string {
  const definition = getItemDefinition(stack.itemId);
  return definition?.name ?? stack.itemId;
}

/** ステータスパネル（右側・能力と育成操作を整理して表示） */
export function CharacterStatusPanel({
  definition,
  owned,
  currency,
  itemInventory,
  onLevelUp,
  onAscend,
}: CharacterStatusPanelProps) {
  const [pending, setPending] = useState(false);

  if (definition === undefined || owned === undefined) {
    return (
      <section className="companion-status" aria-label="ステータス">
        <p className="list-item__meta">キャラクターデータが見つかりません。</p>
      </section>
    );
  }

  const levelPlan = planLevelUp(owned, itemInventory);
  const ascension = planAscension(owned, itemInventory);
  const need = levelPlan.requiredExperience;
  const expPercent = need > 0 ? Math.min(100, Math.round((owned.experience / need) * 100)) : 0;
  const atMaxLevel = owned.level >= levelPlan.maxLevel;
  const affinity = DESTINATIONS.filter((d) => d.recommendedAttributes.includes(definition.attribute));

  const handleLevelUp = () => {
    if (pending || !levelPlan.canLevelUp) return;
    setPending(true);
    try {
      onLevelUp(owned.definitionId);
    } finally {
      setPending(false);
    }
  };

  const handleAscend = () => {
    if (pending || !ascension.canAscend) return;
    setPending(true);
    try {
      onAscend(owned.definitionId);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="companion-status" aria-label={`${definition.name}のステータス`}>
      <div className="companion-status__header">
        <h2 className="companion-status__name">{definition.name}</h2>
        <p className="companion-status__level" key={owned.level}>
          Lv.{owned.level}
          <span className="companion-status__max"> / {levelPlan.maxLevel}</span>
        </p>
      </div>

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
        {!atMaxLevel && (
          <p className="list-item__meta">
            経験値が貯まると自動でレベルアップします。
          </p>
        )}
      </div>

      <dl className="companion-status__rows">
        <div>
          <dt>属性</dt>
          <dd>
            {attributeGlyph(definition.attribute)} {ATTRIBUTE_NAMES[definition.attribute]}
          </dd>
        </div>
        <div>
          <dt>レベル上限</dt>
          <dd>
            {levelPlan.maxLevel}
            {typeof owned.ascensionStage === 'number' && owned.ascensionStage > 0
              ? `（解放 ${owned.ascensionStage}）`
              : ''}
          </dd>
        </div>
        <div>
          <dt>所持通貨</dt>
          <dd>{currency}</dd>
        </div>
      </dl>

      <div className="companion-status__efficiency">
        <p className="companion-status__label">収集効率（基礎値）</p>
        <p className="companion-status__efficiency-value">{definition.baseEfficiency.toFixed(1)}</p>
        {affinity.length > 0 && (
          <p className="list-item__meta">
            相性の良い探索先：{affinity.map((d) => d.name).join('、')}
          </p>
        )}
      </div>

      <p className="companion-status__desc">{definition.description}</p>

      <div className="companion-status__action">
        <button
          type="button"
          className="btn companion-levelup"
          disabled={!levelPlan.canLevelUp || pending}
          onClick={handleLevelUp}
        >
          {pending
            ? '処理中…'
            : atMaxLevel
              ? 'レベル上限に到達'
              : `素材でレベルアップ（${levelPlan.items.map((stack) => `${stackLabel(stack)} ${stack.quantity}`).join(' / ')}）`}
        </button>
        {!levelPlan.canLevelUp && !atMaxLevel && (
          <p className="list-item__meta" role="status">
            素材が足りません。タスクを完了して硬貨・星屑を集めましょう。
          </p>
        )}
      </div>

      {ascension.requirement !== null && (
        <div className="companion-ascension">
          <h3 className="companion-ascension__title">
            レベル上限解放 {ascension.requirement.fromMaxLevel} → {ascension.requirement.toMaxLevel}
          </h3>
          <ul className="companion-ascension__costs">
            <li>
              {ascension.requirement.crystals.rarity} 結晶 ×{ascension.requirement.crystals.quantity}
              <span className="list-item__meta">（同レアリティの任意種類）</span>
            </li>
            <li>
              {stackLabel({ itemId: ascension.requirement.characterMaterial.itemId, quantity: 1 })} ×
              {ascension.requirement.characterMaterial.quantity}
            </li>
            <li>硬貨 {ascension.requirement.coins}</li>
          </ul>
          <button
            type="button"
            className="btn btn--secondary companion-ascend"
            disabled={!ascension.canAscend || pending}
            onClick={handleAscend}
          >
            {ascension.canAscend ? 'レベル上限を解放' : '素材不足'}
          </button>
          {!atMaxLevel && (
            <p className="list-item__meta" role="status">
              Lv.{levelPlan.maxLevel} で上限解放できます。
            </p>
          )}
        </div>
      )}
    </section>
  );
}
