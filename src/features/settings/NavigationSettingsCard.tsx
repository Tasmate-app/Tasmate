import { visibleNavigationItems, PINNED_MOBILE_NAV_ITEM_ID } from '@tasmate/core';
import { NAV_ITEM_META } from '@tasmate/design-tokens';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { GameIcon } from '../../components/ui/GameIcon';
import { useAppStore } from '../../stores/appStore';

/** Web 版のサイドバー表示設定。並び順と表示可否は Native 版と共有する */
export function NavigationSettingsCard() {
  const navigationItems = useAppStore((s) => s.settings.navigationItems);
  const setNavigationItemVisible = useAppStore((s) => s.setNavigationItemVisible);
  const moveNavigationItem = useAppStore((s) => s.moveNavigationItem);
  const resetNavigationItems = useAppStore((s) => s.resetNavigationItems);
  const visibleCount = visibleNavigationItems(navigationItems).length;

  return (
    <Card
      id="navigation"
      title="サイドバー"
      className="nav-settings"
    >
      <p className="settings-note">
        表示する項目と並び順を変更できます。ホームは常に表示されます。設定はアプリ版と共通です。
      </p>

      <ul className="nav-settings__list">
        {navigationItems.map((item, index) => {
          const meta = NAV_ITEM_META[item.id];
          const pinned = item.id === PINNED_MOBILE_NAV_ITEM_ID;
          return (
            <li
              key={item.id}
              className={`nav-settings__row${item.visible ? '' : ' is-hidden'}`}
            >
              <span className="nav-settings__icon" aria-hidden="true">
                <GameIcon name={meta.icon} />
              </span>
              <span className="nav-settings__text">
                <span className="nav-settings__label">{meta.label}</span>
                <span className="nav-settings__desc">{meta.description}</span>
              </span>
              <span className="nav-settings__actions">
                <button
                  type="button"
                  className="nav-settings__move"
                  aria-label={`${meta.label}を上へ移動`}
                  disabled={index === 0}
                  onClick={() => moveNavigationItem(item.id, 'up')}
                >
                  <span aria-hidden="true">▲</span>
                </button>
                <button
                  type="button"
                  className="nav-settings__move"
                  aria-label={`${meta.label}を下へ移動`}
                  disabled={index === navigationItems.length - 1}
                  onClick={() => moveNavigationItem(item.id, 'down')}
                >
                  <span aria-hidden="true">▼</span>
                </button>
                {pinned ? (
                  <span className="nav-settings__pinned">固定</span>
                ) : (
                  <button
                    type="button"
                    className={`nav-settings__toggle${item.visible ? ' is-on' : ''}`}
                    aria-pressed={item.visible}
                    aria-label={`${meta.label}を${item.visible ? '非表示' : '表示'}にする`}
                    onClick={() => setNavigationItemVisible(item.id, !item.visible)}
                  >
                    {item.visible ? '表示中' : '非表示'}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="nav-settings__footer">
        <p className="settings-note">
          現在 {visibleCount} 項目を表示しています。非表示にした画面も、アプリ内のリンクからは開けます。
        </p>
        <Button variant="secondary" onClick={resetNavigationItems}>
          初期配置に戻す
        </Button>
      </div>
    </Card>
  );
}
