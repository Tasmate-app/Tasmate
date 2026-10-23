import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ATTRIBUTE_NAMES } from '../../domain/constants';
import { experienceToNextLevel, levelUpCost } from '../../domain/reward';
import { CHARACTER_DEFINITIONS } from '../../data/seed';
import { useAppStore } from '../../stores/appStore';
import { attributeClass, attributeGlyph } from '../companions/characterVisual';

/** 仲間一覧・レベルアップ（ホームの簡易操作用） */
export function CharacterPanel() {
  const characters = useAppStore((s) => s.characters);
  const inventory = useAppStore((s) => s.inventory);
  const levelUpCharacter = useAppStore((s) => s.levelUpCharacter);

  return (
    <Card title="キャラクター">
      <ul className="list">
        {characters.map((c) => {
          const def = CHARACTER_DEFINITIONS.find((d) => d.id === c.definitionId);
          const cost = levelUpCost(c.level);
          const need = experienceToNextLevel(c.level);
          const canLevelUp = inventory.currency >= cost && c.experience >= need;
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
                  <span className="unit-lv">Lv.{c.level}</span>
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
                <div className="btn-row">
                  <Button disabled={!canLevelUp} onClick={() => levelUpCharacter(c.definitionId)}>
                    レベルアップ（通貨 {cost}）
                  </Button>
                </div>
                {!canLevelUp && (
                  <div className="list-item__meta">
                    {inventory.currency < cost
                      ? '通貨が足りません。作業して報酬を集めましょう。'
                      : '経験値が足りません。キャラを派遣して作業しましょう。'}
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
