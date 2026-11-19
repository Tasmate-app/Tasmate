import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { visibleNavigationItems } from '@tasmate/core';
import { NAV_ITEM_META } from '@tasmate/design-tokens';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useAppStore } from '../../stores/appStore';
import { GameIcon } from '../ui/GameIcon';

interface GameNavigationProps {
  open: boolean;
  onClose: () => void;
}

const DESKTOP_QUERY = '(min-width: 768px)';

/** ゲーム内ナビゲーション（狭い画面はドロワー、広い画面は常設サイドバー） */
export function GameNavigation({ open, onClose }: GameNavigationProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const activeSession = useAppStore((s) => s.activeSession);
  const navigationItems = useAppStore((s) => s.settings.navigationItems);
  const asideRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isWorking = activeSession !== null;
  const items = visibleNavigationItems(navigationItems).map((item) => NAV_ITEM_META[item.id]);
  const visible = isDesktop || open;

  useEffect(() => {
    if (!open || isDesktop) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || asideRef.current === null) return;
      const focusable = asideRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isDesktop, onClose, open]);

  return (
    <>
      {!isDesktop && (
        <div
          className={`game-sidebar__backdrop${open ? ' is-visible' : ''}`}
          aria-hidden="true"
          onClick={onClose}
        />
      )}
      <aside
        ref={asideRef}
        id="game-navigation"
        className={`game-sidebar${open ? ' is-open' : ''}${isDesktop ? ' is-docked' : ''}`}
        aria-label="サイドバー"
        aria-hidden={visible ? undefined : true}
        inert={visible ? undefined : true}
      >
        <div className="game-sidebar__head">
          <p className="game-sidebar__section">メニュー</p>
          <button
            ref={closeRef}
            type="button"
            className="game-sidebar__close"
            onClick={onClose}
            aria-label="メニューを閉じる"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav className="game-nav-list" aria-label="ゲームメニュー">
          {items.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className="game-nav-btn"
              aria-label={item.label}
              title={item.description}
            >
              <span className="game-nav-btn__icon" aria-hidden="true">
                <GameIcon name={item.icon} />
              </span>
              <span className="game-nav-btn__text">
                <span className="game-nav-btn__label">{item.label}</span>
                <span className="game-nav-btn__hint">{item.description}</span>
              </span>
              {item.id === 'home' && isWorking && (
                <span className="game-nav__dot" aria-hidden="true" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="game-sidebar__footer">
          <Link to="/settings#navigation" className="game-sidebar__edit" onClick={onClose}>
            <GameIcon name="settings" />
            <span>メニューを編集</span>
          </Link>
          <p className="game-sidebar__note">
            表示する項目と順番は設定から変更できます。
          </p>
        </div>
      </aside>
    </>
  );
}
