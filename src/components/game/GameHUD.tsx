import { Link } from 'react-router-dom';
import { MATERIAL_NAMES } from '../../domain/constants';
import { remainingRestSeconds } from '../../domain/rest';
import { formatElapsed } from '../../domain/session';
import { useNow } from '../../hooks/useNow';
import { sessionTotalElapsedSeconds, useAppStore } from '../../stores/appStore';
import { resourcePalette } from '@tasmate/design-tokens';
import { GameIcon } from '../ui/GameIcon';

interface ResourceChipProps {
  glyph: string;
  label: string;
  value: number;
  color: string;
  soft: string;
  highlight?: boolean;
}

function ResourceChip({ glyph, label, value, color, soft, highlight = false }: ResourceChipProps) {
  return (
    <span
      className={`game-res${highlight ? ' game-res--highlight' : ''}`}
      title={`${label} ${value}`}
    >
      <span
        className="game-res__glyph"
        style={{ background: soft, color }}
        aria-hidden="true"
      >
        {glyph}
      </span>
      <span className="game-res__label">{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

/** ゲーム内HUD（ロゴ・通貨・素材・作業状態を画面上部に統合表示） */
export function GameHUD({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const inventory = useAppStore((s) => s.inventory);
  const itemInventory = useAppStore((s) => s.itemInventory);
  const activeSession = useAppStore((s) => s.activeSession);
  const restSession = useAppStore((s) => s.restSession);
  const tasks = useAppStore((s) => s.tasks);

  const isWorking = activeSession !== null;
  const isResting = restSession?.state === 'active';
  const now = useNow(1000, (isWorking && activeSession.state === 'running') || isResting);
  const elapsed = sessionTotalElapsedSeconds(activeSession, now);
  const restRemaining = restSession !== null ? remainingRestSeconds(restSession, now) : 0;
  const activeTaskTitle = tasks.find((t) => t.id === activeSession?.taskId)?.title;

  return (
    <div className="game-hud">
      <div className="game-hud__head">
        <button
          type="button"
          className="game-hud__menu"
          onClick={onOpenMenu}
          aria-label="メニューを開く"
          aria-controls="game-navigation"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <Link to="/" className="game-brand" aria-label="Tasmate ホーム">
          <img
            className="game-brand__mark"
            src={`${import.meta.env.BASE_URL}assets/brand/appicon.png`}
            alt=""
            aria-hidden="true"
          />
          <span className="game-brand__text">
            <span className="game-brand__word">Tasmate</span>
            <span className="game-brand__sub">STUDY QUEST</span>
          </span>
        </Link>
        <Link to="/settings" className="game-hud__settings" title="設定" aria-label="設定を開く">
          <GameIcon name="settings" />
        </Link>
      </div>

      <div className="game-hud__resources" role="group" aria-label="所持資源">
        <ResourceChip
          glyph={resourcePalette.currency.glyph}
          label={resourcePalette.currency.label}
          value={inventory.currency}
          color={resourcePalette.currency.color}
          soft={resourcePalette.currency.soft}
          highlight
        />
        <ResourceChip
          glyph={resourcePalette.stardust.glyph}
          label={resourcePalette.stardust.label}
          value={itemInventory['stardust'] ?? 0}
          color={resourcePalette.stardust.color}
          soft={resourcePalette.stardust.soft}
        />
        <ResourceChip
          glyph={resourcePalette.shard_sun.glyph}
          label={MATERIAL_NAMES['shard_sun'] ?? resourcePalette.shard_sun.label}
          value={inventory.materials.shard_sun}
          color={resourcePalette.shard_sun.color}
          soft={resourcePalette.shard_sun.soft}
        />
        <ResourceChip
          glyph={resourcePalette.shard_moon.glyph}
          label={MATERIAL_NAMES['shard_moon'] ?? resourcePalette.shard_moon.label}
          value={inventory.materials.shard_moon}
          color={resourcePalette.shard_moon.color}
          soft={resourcePalette.shard_moon.soft}
        />
        <ResourceChip
          glyph={resourcePalette.shard_star.glyph}
          label={MATERIAL_NAMES['shard_star'] ?? resourcePalette.shard_star.label}
          value={inventory.materials.shard_star}
          color={resourcePalette.shard_star.color}
          soft={resourcePalette.shard_star.soft}
        />
        {isWorking && (
          <span
            className={`game-res game-res--session${activeSession.state === 'paused' ? ' is-paused' : ''}`}
            title={activeTaskTitle ?? ''}
          >
            <span className="game-res__status" aria-hidden="true" />
            <span className="game-res__label">
              {activeSession.state === 'paused' ? '停止中' : '作業中'}
            </span>
            <strong>{formatElapsed(elapsed)}</strong>
          </span>
        )}
        {isResting && (
          <span className="game-res game-res--rest" title="休憩中">
            <span className="game-res__status" aria-hidden="true" />
            <span className="game-res__label">休憩中</span>
            <strong>{formatElapsed(restRemaining)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
