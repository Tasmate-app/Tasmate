import { Card } from '../../components/ui/Card';
import { MATERIAL_NAMES } from '../../domain/constants';
import { useAppStore } from '../../stores/appStore';

/** 報酬履歴 */
export function RewardHistory() {
  const rewards = useAppStore((s) => s.rewards);

  return (
    <Card title="報酬履歴">
      {rewards.length === 0 ? (
        <p className="list-item__meta">
          まだ報酬がありません。タスクに取り組んで最初の報酬を受け取りましょう。
        </p>
      ) : (
        <ul className="list">
          {rewards.slice(0, 20).map((r) => (
            <li key={r.id} className="list-item">
              <div className="list-item__title">
                通貨 +{r.finalReward.currency} ／ 経験値 +{r.finalReward.experience}
                {Object.entries(r.finalReward.materials).map(([id, qty]) => (
                  <span key={id}>
                    {' '}
                    ／ {MATERIAL_NAMES[id] ?? id} +{qty}
                  </span>
                ))}
              </div>
              <div className="list-item__meta">
                {r.inputSummary}（{new Date(r.createdAt).toLocaleString('ja-JP')}）
              </div>
              <div className="list-item__meta">{r.reason}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
