import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { facilityUpgradeCost, formatFacilityProduction } from '../../domain/facility';
import { FACILITY_DEFINITIONS } from '../../data/seed';
import { useAppStore } from '../../stores/appStore';

/** ショップ（ゲーム内の施設強化ショップ。未実装の購入は作らない） */
export function ShopPage() {
  const facilities = useAppStore((s) => s.facilities);
  const inventory = useAppStore((s) => s.inventory);
  const upgradeFacility = useAppStore((s) => s.upgradeFacility);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleBuy = (definitionId: string, name: string) => {
    const ok = upgradeFacility(definitionId);
    setFeedback(ok ? `「${name}」を強化しました！` : '通貨が足りないため購入できません。');
  };

  return (
    <div className="game-screen">
      <div className="game-container">
        <h1 className="game-screen__title">ショップ</h1>
        <p className="list-item__meta companion-lead">
          作業で集めた通貨で施設を強化できます。所持通貨：{inventory.currency}
        </p>
        {feedback !== null && (
          <p className="shop-feedback" role="status">
            {feedback}
          </p>
        )}
        <ul className="list menu-list">
          {facilities.map((f) => {
            const def = FACILITY_DEFINITIONS.find((d) => d.id === f.definitionId);
            const cost = facilityUpgradeCost(f.level);
            const production =
              def !== undefined ? formatFacilityProduction(def, f.level) : '';
            return (
              <li key={f.definitionId} className="list-item unit-row">
                <span className="unit-avatar unit-avatar--facility is-on" aria-hidden="true">
                  {def?.type === 'currency' ? '◉' : '⬢'}
                </span>
                <div className="unit-body">
                  <div className="list-item__title">
                    {def?.name ?? f.definitionId} <span className="unit-lv">所持 Lv.{f.level}</span>
                  </div>
                  <div className="list-item__meta">強化で生産量アップ（現在 {production}）</div>
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn"
                      disabled={inventory.currency < cost}
                      onClick={() => handleBuy(f.definitionId, def?.name ?? f.definitionId)}
                    >
                      通貨 {cost} で強化
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="sortie-grid">
          <Card title="家具（準備中）">
            <p className="list-item__meta">
              シェアハウスを飾る家具の購入・配置は初期版以降に対応します。
            </p>
          </Card>
          <Card title="コスチューム（準備中）">
            <p className="list-item__meta">
              キャラクターの見た目変更は初期版以降に対応します。
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
