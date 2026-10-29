import { Outlet } from 'react-router-dom';
import { GameHUD } from './GameHUD';
import { GameNavigation } from './GameNavigation';
import { SupportEventLayer } from './SupportEventLayer';

/** ゲーム画面全体のフレーム（HUD＋メイン領域＋下部ナビ） */
export function GameShell() {
  return (
    <div className="game-shell">
      <header className="game-hud-bar">
        <GameHUD />
      </header>
      <SupportEventLayer />
      <main className="game-main">
        <Outlet />
      </main>
      <footer className="game-nav-bar">
        <GameNavigation />
      </footer>
    </div>
  );
}
