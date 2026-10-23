export type GameIconName =
  | 'home'
  | 'sortie'
  | 'calendar'
  | 'companions'
  | 'facility'
  | 'shop'
  | 'storage';

/** ゲームメニュー用のオリジナル線画アイコン（外部素材不使用） */
export function GameIcon({ name }: { name: GameIconName }) {
  return (
    <svg
      className="game-icon"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === 'home' && (
        <path d="M4 10.5 10 4l6 6.5V17a1 1 0 0 1-1 1h-4.5v-5h-2v5H5a1 1 0 0 1-1-1Z" />
      )}
      {name === 'sortie' && (
        <>
          <path d="M6 2.5V17.5" />
          <path d="M6 3.5h10.5l-2.8 3.7 2.8 3.8H6" />
        </>
      )}
      {name === 'calendar' && (
        <>
          <rect x="3" y="4.5" width="14" height="13" rx="2" />
          <path d="M3 8.5h14M7 2.8v3.4M13 2.8v3.4" />
          <path d="M7 12h2M11 12h2M7 15h2M11 15h2" />
        </>
      )}
      {name === 'companions' && (
        <>
          <circle cx="8.5" cy="7.5" r="3" />
          <circle cx="15" cy="8.5" r="2.3" />
          <path d="M3.5 18.5c.6-3.1 2.6-4.8 5-4.8s4.4 1.7 5 4.8" />
          <path d="M14 14c2.1.3 3.6 1.8 4 4" />
        </>
      )}
      {name === 'facility' && (
        <>
          <circle cx="10" cy="10" r="2.6" />
          <path d="M10 2.8v2.4M10 14.8v2.4M2.8 10h2.4M14.8 10h2.4M4.9 4.9l1.7 1.7M13.4 13.4l1.7 1.7M15.1 4.9l-1.7 1.7M6.6 13.4l-1.7 1.7" />
        </>
      )}
      {name === 'shop' && (
        <>
          <path d="M4 8.5 5.2 4h9.6L16 8.5" />
          <path d="M4 8.5h12V11a2.2 2.2 0 0 1-4.4 0 2.2 2.2 0 0 1-4.4 0 1.6 1.6 0 0 1-3.2 0" />
          <path d="M5.5 13.5V18h9v-4.5" />
          <path d="M9 18v-3h2v3" />
        </>
      )}
      {name === 'storage' && (
        <>
          <path d="M3.5 7.5 10 4l6.5 3.5v7L10 18l-6.5-3.5Z" />
          <path d="M3.5 7.5 10 11l6.5-3.5M10 11v7" />
        </>
      )}
    </svg>
  );
}
