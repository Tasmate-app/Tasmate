import { useState } from 'react';
import { ActiveSortie } from './ActiveSortie';
import { QuestBoard } from './QuestBoard';
import { SortieResult } from './SortieResult';
import { useAppStore } from '../../stores/appStore';

/** 出撃（クエスト選択・作業中・完了リザルトを明確に分ける） */
export function SortiePage() {
  const activeSession = useAppStore((s) => s.activeSession);
  const [lastRewardId, setLastRewardId] = useState<string | null>(null);

  return (
    <div className="game-container">
      <div className="notice notice--provisional">
        報酬ルール・数値はすべて仮実装です（AI 報酬は未接続）。タイマーは開始時刻を基準に計算され、
        ページを再読み込みしても作業状態が復元されます。
      </div>
      {activeSession !== null ? (
        <ActiveSortie onFinished={setLastRewardId} />
      ) : (
        <>
          {lastRewardId !== null && (
            <SortieResult rewardId={lastRewardId} onClose={() => setLastRewardId(null)} />
          )}
          <QuestBoard />
        </>
      )}
    </div>
  );
}
