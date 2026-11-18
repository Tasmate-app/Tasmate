import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TutorialGate } from '../../features/tutorial/TutorialGate';
import { GameHUD } from './GameHUD';
import { GameNavigation } from './GameNavigation';
import { SupportEventLayer } from './SupportEventLayer';
import { UndoToast } from './UndoToast';

/** ゲーム画面全体のフレーム（HUD＋サイドバー＋メイン領域） */
export function GameShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="game-shell">
      <header className="game-hud-bar">
        <GameHUD onOpenMenu={() => setMenuOpen(true)} />
      </header>
      <SupportEventLayer />
      <UndoToast />
      <TutorialGate />
      <GameNavigation open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="game-main">
        <Outlet />
      </main>
    </div>
  );
}
