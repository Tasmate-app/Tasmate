import { RewardHistory } from '../house/RewardHistory';
import { InventoryPanel } from './InventoryPanel';

/** かばん画面。所持素材と報酬履歴を確認する。 */
export function StoragePage() {
  return (
    <div className="game-screen">
      <div className="game-container">
        <h1 className="game-screen__title">かばん</h1>
        <p className="list-item__meta companion-lead">
          所持している素材と、これまでの作業報酬を確認できます。
        </p>
        <InventoryPanel />
        <RewardHistory />
      </div>
    </div>
  );
}
