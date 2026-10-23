import { MATERIAL_NAMES } from '../../domain/constants';
import { formatElapsed } from '../../domain/session';
import { useNow } from '../../hooks/useNow';
import { sessionElapsedSeconds, useAppStore } from '../../stores/appStore';

const MATERIAL_DOT_COLORS: Record<string, string> = {
  shard_sun: 'var(--attr-sun)',
  shard_moon: 'var(--attr-moon)',
  shard_star: 'var(--attr-star)',
};

/** ゲーム内HUD（ロゴ・通貨・素材・作業状態を画面上部に統合表示） */
export function GameHUD() {
  const inventory = useAppStore((s) => s.inventory);
  const activeSession = useAppStore((s) => s.activeSession);
  const tasks = useAppStore((s) => s.tasks);

  const isWorking = activeSession !== null;
  const now = useNow(1000, isWorking && activeSession.state === 'running');
  const elapsed = sessionElapsedSeconds(activeSession, now);
  const activeTaskTitle = tasks.find((t) => t.id === activeSession?.taskId)?.title;

  return (
    <div className="game-hud">
      <div className="game-brand" aria-label="Tasmate">
        <span className="game-brand__mark" aria-hidden="true">
          T
        </span>
        <span className="game-brand__word">Tasmate</span>
      </div>
      <div className="game-hud__resources" aria-label="所持資源">
        <span className="game-res" title="ゲーム内通貨">
          <span className="game-res__dot game-res__dot--coin" aria-hidden="true" />
          <span className="game-res__label">通貨</span> <strong>{inventory.currency}</strong>
        </span>
        <span className="game-res" title={MATERIAL_NAMES['shard_sun']}>
          <span
            className="game-res__dot"
            style={{ background: MATERIAL_DOT_COLORS['shard_sun'] }}
            aria-hidden="true"
          />
          <span className="game-res__label">太陽</span>{' '}
          <strong>{inventory.materials.shard_sun}</strong>
        </span>
        <span className="game-res" title={MATERIAL_NAMES['shard_moon']}>
          <span
            className="game-res__dot"
            style={{ background: MATERIAL_DOT_COLORS['shard_moon'] }}
            aria-hidden="true"
          />
          <span className="game-res__label">月</span> <strong>{inventory.materials.shard_moon}</strong>
        </span>
        <span className="game-res" title={MATERIAL_NAMES['shard_star']}>
          <span
            className="game-res__dot"
            style={{ background: MATERIAL_DOT_COLORS['shard_star'] }}
            aria-hidden="true"
          />
          <span className="game-res__label">星</span>{' '}
          <strong>{inventory.materials.shard_star}</strong>
        </span>
        {isWorking && (
          <span
            className={`game-res game-res--session${activeSession.state === 'paused' ? ' is-paused' : ''}`}
            title={activeTaskTitle ?? ''}
          >
            <span className="game-res__label">
              {activeSession.state === 'paused' ? '停止中' : '作業中'}
            </span>{' '}
            <strong>{formatElapsed(elapsed)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
