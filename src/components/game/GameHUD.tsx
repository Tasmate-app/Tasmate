import { MATERIAL_NAMES } from '../../domain/constants';
import { remainingRestSeconds } from '../../domain/rest';
import { formatElapsed } from '../../domain/session';
import { useNow } from '../../hooks/useNow';
import { sessionElapsedSeconds, useAppStore } from '../../stores/appStore';

interface MaterialGlyph {
  glyph: string;
  color: string;
  background: string;
}

const MATERIAL_GLYPHS: Record<string, MaterialGlyph> = {
  shard_sun: { glyph: '☀', color: 'var(--attr-sun)', background: 'var(--color-gold-soft)' },
  shard_moon: { glyph: '☾', color: 'var(--attr-moon)', background: 'var(--color-accent-soft)' },
  shard_star: { glyph: '★', color: 'var(--attr-star)', background: 'var(--color-pink-soft)' },
};

/** ゲーム内HUD（ロゴ・通貨・素材・作業状態を画面上部に統合表示） */
export function GameHUD() {
  const inventory = useAppStore((s) => s.inventory);
  const activeSession = useAppStore((s) => s.activeSession);
  const restSession = useAppStore((s) => s.restSession);
  const tasks = useAppStore((s) => s.tasks);

  const isWorking = activeSession !== null;
  const isResting = restSession?.state === 'active';
  const now = useNow(1000, (isWorking && activeSession.state === 'running') || isResting);
  const elapsed = sessionElapsedSeconds(activeSession, now);
  const restRemaining = restSession !== null ? remainingRestSeconds(restSession, now) : 0;
  const activeTaskTitle = tasks.find((t) => t.id === activeSession?.taskId)?.title;

  return (
    <div className="game-hud">
      <div className="game-brand" aria-label="Tasmate">
        <span className="game-brand__mark" aria-hidden="true">
          T
        </span>
        <span className="game-brand__text">
          <span className="game-brand__word">Tasmate</span>
          <span className="game-brand__sub">STUDY &amp; TASK</span>
        </span>
      </div>
      <div className="game-hud__resources" aria-label="所持資源">
        <span className="game-res game-res--coin" title="ゲーム内通貨">
          <span className="game-res__glyph" aria-hidden="true">
            G
          </span>
          <span className="game-res__label">通貨</span> <strong>{inventory.currency}</strong>
        </span>
        <span className="game-res" title={MATERIAL_NAMES['shard_sun']}>
          <span
            className="game-res__glyph"
            style={{
              background: MATERIAL_GLYPHS['shard_sun'].background,
              color: MATERIAL_GLYPHS['shard_sun'].color,
            }}
            aria-hidden="true"
          >
            {MATERIAL_GLYPHS['shard_sun'].glyph}
          </span>
          <span className="game-res__label">太陽</span>{' '}
          <strong>{inventory.materials.shard_sun}</strong>
        </span>
        <span className="game-res" title={MATERIAL_NAMES['shard_moon']}>
          <span
            className="game-res__glyph"
            style={{
              background: MATERIAL_GLYPHS['shard_moon'].background,
              color: MATERIAL_GLYPHS['shard_moon'].color,
            }}
            aria-hidden="true"
          >
            {MATERIAL_GLYPHS['shard_moon'].glyph}
          </span>
          <span className="game-res__label">月</span> <strong>{inventory.materials.shard_moon}</strong>
        </span>
        <span className="game-res" title={MATERIAL_NAMES['shard_star']}>
          <span
            className="game-res__glyph"
            style={{
              background: MATERIAL_GLYPHS['shard_star'].background,
              color: MATERIAL_GLYPHS['shard_star'].color,
            }}
            aria-hidden="true"
          >
            {MATERIAL_GLYPHS['shard_star'].glyph}
          </span>
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
        {isResting && (
          <span className="game-res game-res--rest" title="休憩中">
            <span className="game-res__label">休憩中</span>{' '}
            <strong>{formatElapsed(restRemaining)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
