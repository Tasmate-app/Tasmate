import { Card } from '../../components/ui/Card';
import { RoomScene } from '../../game3d/RoomScene';
import { CharacterPanel } from './CharacterPanel';
import { FacilityPanel } from './FacilityPanel';
import { RewardHistory } from './RewardHistory';

/** シェアハウス画面 */
export function HousePage() {
  return (
    <div className="page-grid">
      <Card title="シェアハウス（3D試作）">
        <p className="list-item__meta">
          ドラッグで回転・ホイールでズームできます。部屋・家具・キャラはすべて仮モデルです。
          3Dが苦手な場合でも、下の一覧から育成・強化・履歴の確認ができます。
        </p>
        <RoomScene />
      </Card>
      <div className="page-grid page-grid--two">
        <CharacterPanel />
        <FacilityPanel />
      </div>
      <RewardHistory />
    </div>
  );
}
