import { useState } from 'react';
import { HomeOverview } from '../home/HomeOverview';
import { NextQuest } from '../home/NextQuest';
import { ActiveSortie } from './ActiveSortie';
import { InterruptedQuestList } from './InterruptedQuestList';
import { QuestBoard } from './QuestBoard';
import { SortieResult } from './SortieResult';
import { useAppStore } from '../../stores/appStore';

/** 出撃（クエスト選択・作業中・完了リザルトを明確に分ける） */
export function SortiePage() {
  const activeSession = useAppStore((s) => s.activeSession);
  const [lastRewardId, setLastRewardId] = useState<string | null>(null);

  return (
    <div className="game-screen">
      <div className="game-container">
        <header className="game-screen__head">
          <div>
            <h1 className="game-screen__title">ホーム</h1>
            <p className="game-screen__lead">
              今日やることを選び、作業した時間をそのまま冒険に変えましょう。
            </p>
          </div>
        </header>

        <div className="notice notice--provisional">
          報酬ルール・数値はすべて仮実装です。タイマーは開始時刻を基準に計算され、
          ページを再読み込みしても作業状態が復元されます。
        </div>

        <HomeOverview />

        {activeSession !== null ? (
          <>
            <ActiveSortie onFinished={setLastRewardId} />
            <InterruptedQuestList />
          </>
        ) : (
          <>
            {lastRewardId !== null && (
              <SortieResult rewardId={lastRewardId} onClose={() => setLastRewardId(null)} />
            )}
            <InterruptedQuestList />
            <NextQuest />
            <QuestBoard />
          </>
        )}
      </div>
    </div>
  );
}
