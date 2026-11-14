import { getItemDefinition } from '@tasmate/core';
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
  const taskRewards = useAppStore((s) => s.taskRewards);
  const sessionHistory = useAppStore((s) => s.sessionHistory);
  const reward = rewards.find((r) => r.id === rewardId);
  const taskReward = taskRewards.find((r) => r.rewardRecordId === rewardId);
  const session = sessionHistory.find((s) => s.id === reward?.workSessionId);
  const interrupted = session?.result === 'interrupted';

  if (reward === undefined) return null;

  const droppedItems =
    taskReward === undefined
      ? []
      : [...taskReward.crystals, ...taskReward.materials].flatMap((stack) => {
          const definition = getItemDefinition(stack.itemId);
          return definition === undefined ? [] : [{ definition, quantity: stack.quantity }];
        });

  return (
    <Card title={interrupted ? 'クエストを中断しました' : 'クエスト完了！'}>
      <div className="result-banner" role="status">
        {interrupted && (
          <p className="list-item__meta">
            ここまでの報酬を確定しました。クエストは中断中として保持され、いつでも再開できます。
          </p>
        )}
        <p className="result-banner__title">
          通貨 +{reward.finalReward.currency} ／ 経験値 +{reward.finalReward.experience}
          {Object.entries(reward.finalReward.materials).map(([id, qty]) => (
            <span key={id}>
              {' '}
              ／ {MATERIAL_NAMES[id] ?? id} +{qty}
            </span>
          ))}
        </p>
        {taskReward !== undefined && (
          <div className="result-drops" aria-label="追加報酬">
            <p className="result-drops__stardust">
              <span aria-hidden="true">✨</span> 星屑 +{taskReward.stardust}
            </p>
            {droppedItems.map(({ definition, quantity }) => (
              <span
                key={definition.id}
                className={`result-drop rarity-${definition.rarity.toLowerCase()}`}
              >
                <span className="result-drop__icon" aria-hidden="true">
                  {definition.icon}
                </span>
                <span className="result-drop__name">{definition.name}</span>
                <span className={`rarity-badge rarity-${definition.rarity.toLowerCase()}`}>
                  {definition.rarity}
                </span>
                <strong>+{quantity}</strong>
              </span>
            ))}
            {droppedItems.length === 0 && (
              <p className="list-item__meta">結晶・素材のドロップはありませんでした。</p>
            )}
            <p className="list-item__meta">
              判定: {taskReward.aiEvaluation.source === 'ai' ? 'AI' : '簡易判定'} ・ 難易度{' '}
              {taskReward.aiEvaluation.difficulty}
            </p>
          </div>
        )}
        <p className="list-item__meta">{reward.inputSummary}</p>
        <p className="list-item__meta">{reward.reason}</p>
      </div>
      {!interrupted && <RestPrompt rewardId={rewardId} />}
      <div className="btn-row">
        <Button variant="secondary" onClick={onClose}>
          {interrupted ? '中断中のクエスト一覧へ' : 'クエスト一覧に戻る'}
        </Button>
      </div>
    </Card>
  );
}
