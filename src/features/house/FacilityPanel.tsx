import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { facilityUpgradeCost, formatFacilityProduction } from '../../domain/facility';
import { FACILITY_DEFINITIONS } from '../../data/seed';
import { useAppStore } from '../../stores/appStore';

/** 施設一覧・強化（ホームの簡易操作用） */
export function FacilityPanel() {
  const facilities = useAppStore((s) => s.facilities);
  const inventory = useAppStore((s) => s.inventory);
  const upgradeFacility = useAppStore((s) => s.upgradeFacility);
  const toggleFacility = useAppStore((s) => s.toggleFacility);

  return (
    <Card title="施設（作業中に稼働）">
      <ul className="list">
        {facilities.map((f) => {
          const def = FACILITY_DEFINITIONS.find((d) => d.id === f.definitionId);
          const cost = facilityUpgradeCost(f.level);
          const production =
            def !== undefined ? formatFacilityProduction(def, f.level) : '';

          return (
            <li key={f.definitionId} className="list-item unit-row">
              <span
                className={`unit-avatar unit-avatar--facility${f.enabled ? ' is-on' : ''}`}
                aria-hidden="true"
              >
                {def?.type === 'currency' ? '◉' : '⬢'}
              </span>
              <div className="unit-body">
                <div className="list-item__title">
                  {def?.name ?? f.definitionId} <span className="unit-lv">Lv.{f.level}</span>{' '}
                  <Badge tone={f.enabled ? 'running' : undefined}>
                    {f.enabled ? '稼働中' : '停止中'}
                  </Badge>
                </div>
                <div className="list-item__meta">
                  {def?.description}／現在の生産量 {production}
                </div>
                <div className="btn-row">
                  <Button
                    disabled={inventory.currency < cost}
                    onClick={() => upgradeFacility(f.definitionId)}
                  >
                    強化（通貨 {cost}）
                  </Button>
                  <Button variant="secondary" onClick={() => toggleFacility(f.definitionId)}>
                    {f.enabled ? '停止する' : '稼働する'}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
