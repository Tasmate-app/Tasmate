import { NavLink } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { GameIcon, type GameIconName } from '../ui/GameIcon';

interface NavItem {
  to: string;
  end?: boolean;
  label: string;
  title: string;
  icon: GameIconName;
  dot?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', end: true, label: 'ホーム', title: 'ホーム（3Dシェアハウス）', icon: 'home' },
  { to: '/sortie', label: '出撃', title: '出撃（クエスト選択・作業タイマー）', icon: 'sortie', dot: true },
  { to: '/calendar', label: '計画', title: '計画（週間カレンダー・継続報酬）', icon: 'calendar' },
  { to: '/history', label: '履歴', title: '履歴（作業時間の集計・推移）', icon: 'history' },
  { to: '/categories', label: '分類', title: 'カテゴリー管理（カテゴリー・サブカテゴリー）', icon: 'categories' },
  { to: '/companions', label: '仲間', title: '仲間（キャラクター育成）', icon: 'companions' },
  { to: '/facilities', label: '施設', title: '施設（一覧・強化）', icon: 'facility' },
  { to: '/shop', label: 'ショップ', title: 'ショップ（施設強化）', icon: 'shop' },
  { to: '/storage', label: '倉庫', title: '倉庫（報酬履歴）', icon: 'storage' },
  { to: '/synthesis', label: '合成', title: '合成（結晶づくり）', icon: 'synthesis' },
];

/** ゲーム内ナビゲーション（画面下部のメインメニュー） */
export function GameNavigation() {
  const activeSession = useAppStore((s) => s.activeSession);
  const isWorking = activeSession !== null;

  return (
    <nav className="game-nav-bottom" aria-label="ゲームメニュー">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} title={item.title} className="game-nav-btn">
          <GameIcon name={item.icon} />
          <span className="game-nav-btn__label">{item.label}</span>
          {item.dot === true && isWorking && <span className="game-nav__dot" aria-hidden="true" />}
        </NavLink>
      ))}
    </nav>
  );
}
