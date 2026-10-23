import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { BALANCE, MATERIAL_NAMES } from '../../domain/constants';
import { facilityUpgradeCost } from '../../domain/facility';
import { FACILITY_DEFINITIONS } from '../../data/seed';
import { useAppStore } from '../../stores/appStore';

interface FacilitiesLocationState {
  selectedId?: string;
}

function getInitialSelectedId(state: unknown, definitionIds: string[]): string | null {
  if (typeof state === 'object' && state !== null) {
    const selectedId = (state as FacilitiesLocationState).selectedId;
    if (typeof selectedId === 'string' && definitionIds.includes(selectedId)) {
      return selectedId;
    }
  }
  return null;
}

function productionLabel(definitionId: string): string {
  const def = FACILITY_DEFINITIONS.find((d) => d.id === definitionId);
  if (def === undefined) return '';
  return def.type === 'currency'
    ? `通貨 ${def.baseProductionPerMinute}/分`
    : `素材（${MATERIAL_NAMES[def.materialId ?? ''] ?? ''}）${def.baseProductionPerMinute}/分`;
}

/** 施設（ゲーム内の施設画面。一覧→詳細） */
export function FacilitiesPage() {
  const facilities = useAppStore((s) => s.facilities);
  const inventory = useAppStore((s) => s.inventory);
  const upgradeFacility = useAppStore((s) => s.upgradeFacility);
  const toggleFacility = useAppStore((s) => s.toggleFacility);
  const location = useLocation();

  const [selectedId, setSelectedId] = useState<string | null>(() =>
    getInitialSelectedId(
      location.state,
      facilities.map((f) => f.definitionId),
    ),
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const owned = facilities.find((f) => f.definitionId === selectedId) ?? null;
  const definition =
    owned !== null
      ? (FACILITY_DEFINITIONS.find((d) => d.id === owned.definitionId) ?? null)
      : null;

  const handleUpgrade = (definitionId: string) => {
    const ok = upgradeFacility(definitionId);
    setFeedback(ok ? '施設を強化しました！' : '通貨が足りないため強化できません。');
  };

  return (
    <div className="game-screen">
      <div className="game-container">
        {owned === null || definition === null ? (
          <>
            <h1 className="game-screen__title">施設</h1>
            <p className="list-item__meta companion-lead">
              施設を選ぶと詳細画面が開きます。施設は作業中に通貨や素材を生産します。
            </p>
            <ul className="list menu-list">
              {facilities.map((f) => {
                const def = FACILITY_DEFINITIONS.find((d) => d.id === f.definitionId);
                return (
                  <li key={f.definitionId}>
                    <button
                      type="button"
                      className="menu-card"
                      onClick={() => {
                        setSelectedId(f.definitionId);
                        setFeedback(null);
                      }}
                    >
                      <span className="unit-avatar unit-avatar--facility" aria-hidden="true">
                        {def?.type === 'currency' ? '◉' : '⬢'}
                      </span>
                      <span className="unit-body">
                        <span className="list-item__title">
                          {def?.name ?? f.definitionId} <span className="unit-lv">Lv.{f.level}</span>{' '}
                          <Badge tone={f.enabled ? 'running' : undefined}>
                            {f.enabled ? '稼働中' : '停止中'}
                          </Badge>
                        </span>
                        <span className="list-item__meta">{productionLabel(f.definitionId)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <>
            <div className="game-screen__head">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setSelectedId(null);
                  setFeedback(null);
                }}
              >
                ← 施設一覧に戻る
              </button>
            </div>
            <Card title={`${definition.name} Lv.${owned.level}`}>
              <p className="list-item__meta">
                <Badge tone={owned.enabled ? 'running' : undefined}>
                  {owned.enabled ? '稼働中' : '停止中'}
                </Badge>
              </p>
              <p className="list-item__meta">{definition.description}</p>
              <dl className="companion-status__rows">
                <div>
                  <dt>基礎生産</dt>
                  <dd>{productionLabel(owned.definitionId)}</dd>
                </div>
                <div>
                  <dt>レベル補正</dt>
                  <dd>
                    ×
                    {(1 + Math.max(0, owned.level - 1) * BALANCE.facilityPerLevel).toFixed(1)}
                  </dd>
                </div>
                <div>
                  <dt>強化コスト</dt>
                  <dd>通貨 {facilityUpgradeCost(owned.level)}</dd>
                </div>
                <div>
                  <dt>所持通貨</dt>
                  <dd>{inventory.currency}</dd>
                </div>
              </dl>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn"
                  disabled={inventory.currency < facilityUpgradeCost(owned.level)}
                  onClick={() => handleUpgrade(owned.definitionId)}
                >
                  強化する（通貨 {facilityUpgradeCost(owned.level)}）
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => toggleFacility(owned.definitionId)}
                >
                  {owned.enabled ? '稼働を停止する' : '稼働を再開する'}
                </button>
              </div>
              {feedback !== null && (
                <p className="list-item__meta" role="status">
                  {feedback}
                </p>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
