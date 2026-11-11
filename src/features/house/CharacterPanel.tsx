import { planLevelUp } from '@tasmate/core';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ATTRIBUTE_NAMES } from '../../domain/constants';
import { CHARACTER_DEFINITIONS } from '../../data/seed';
import { useAppStore } from '../../stores/appStore';
import { attributeClass, attributeGlyph } from '../companions/characterVisual';

/** 仲間一覧・レベルアップ（ホームの簡易操作用） */
export function CharacterPanel() {
  const characters = useAppStore((s) => s.characters);
  const itemInventory = useAppStore((s) => s.itemInventory);
  const levelUpCharacter = useAppStore((s) => s.levelUpCharacter);

  return (
    <Card title="キャラクター">
      <ul className="list">
        {characters.map((c) => {
          const def = CHARACTER_DEFINITIONS.find((d) => d.id === c.definitionId);
          const levelPlan = planLevelUp(c, itemInventory);
          const coinCost = levelPlan.items.find((stack) => stack.itemId === 'coin')?.quantity ?? 0;
          const stardustCost =
            levelPlan.items.find((stack) => stack.itemId === 'stardust')?.quantity ?? 0;
          const need = levelPlan.requiredExperience;
          const atMaxLevel = c.level >= levelPlan.maxLevel;
          const canLevelUp = levelPlan.canLevelUp;
          const expPercent = need > 0 ? Math.min(100, Math.round((c.experience / need) * 100)) : 0;
          const initial = def?.name !== undefined && def.name !== '' ? def.name.slice(0, 1) : '？';
          return (
            <li key={c.definitionId} className="list-item unit-row">
              <span
                className={`unit-avatar ${attributeClass(def?.attribute ?? 'none')}`}
                aria-hidden="true"
              >
                {initial}
              </span>
              <div className="unit-body">
                <div className="list-item__title">
                  {def?.name ?? c.definitionId}{' '}
                  <span className="unit-lv">
                    Lv.{c.level} / {levelPlan.maxLevel}
                  </span>
                </div>
                <div className="list-item__meta">
                  {attributeGlyph(def?.attribute ?? 'none')} {ATTRIBUTE_NAMES[def?.attribute ?? 'none']}
                  {' ／ '}経験値 {c.experience}/{need}
                  {' ／ '}効率 {def?.baseEfficiency.toFixed(1)}
                </div>
                <div
                  className="progress progress--slim"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={need}
                  aria-valuenow={Math.min(c.experience, need)}
                  aria-label={`${def?.name ?? c.definitionId}の経験値`}
                >
                  <div className="progress__bar" style={{ width: `${expPercent}%` }} />
                </div>
                {def?.description !== undefined && def.description !== '' && (
                  <div className="list-item__meta">{def.description}</div>
                )}
                {!atMaxLevel && (
                  <div className="list-item__meta">経験値が貯まると自動でレベルアップします。</div>
                )}
                <div className="btn-row">
                  <Button disabled={!canLevelUp} onClick={() => levelUpCharacter(c.definitionId)}>
                    {atMaxLevel
                      ? 'レベル上限に到達'
                      : `素材でレベルアップ（硬貨 ${coinCost} / 星屑 ${stardustCost}）`}
                  </Button>
                </div>
                {!canLevelUp && !atMaxLevel && (
                  <div className="list-item__meta">
                    素材が足りません。タスクを完了して硬貨・星屑を集めましょう。
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
