import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { MATERIAL_NAMES } from '../../domain/constants';
import { useAppStore } from '../../stores/appStore';
import { RestPrompt } from '../rest/RestPrompt';

interface SortieResultProps {
  rewardId: string;
  onClose: () => void;
}

/** 完了リザルト（報酬確定の表示に専念し、次のクエスト選択へ誘導） */
export function SortieResult({ rewardId, onClose }: SortieResultProps) {
  const rewards = useAppStore((s) => s.rewards);
  const reward = rewards.find((r) => r.id === rewardId);

  if (reward === undefined) return null;

  return (
    <Card title="クエスト完了！">
      <div className="result-banner" role="status">
        <p className="result-banner__title">
          通貨 +{reward.finalReward.currency} ／ 経験値 +{reward.finalReward.experience}
          {Object.entries(reward.finalReward.materials).map(([id, qty]) => (
            <span key={id}>
              {' '}
              ／ {MATERIAL_NAMES[id] ?? id} +{qty}
            </span>
          ))}
        </p>
        <p className="list-item__meta">{reward.inputSummary}</p>
        <p className="list-item__meta">{reward.reason}</p>
      </div>
      <RestPrompt rewardId={rewardId} />
      <div className="btn-row">
        <Button variant="secondary" onClick={onClose}>
          クエスト一覧に戻る
        </Button>
      </div>
    </Card>
  );
}
