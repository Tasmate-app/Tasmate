import { RewardHistory } from '../house/RewardHistory';

/** 倉庫（ゲーム内の記録保管庫。報酬履歴を表示） */
export function StoragePage() {
  return (
    <div className="game-screen">
      <div className="game-container">
        <h1 className="game-screen__title">倉庫</h1>
        <p className="list-item__meta companion-lead">
          これまでの作業と報酬の記録を確認できます。
        </p>
        <RewardHistory />
      </div>
    </div>
  );
}
