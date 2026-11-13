import { Link } from 'react-router-dom';
import { webLicenseEntries } from '@tasmate/core/licenses';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

/** OSSライセンス一覧。直接依存しているサードパーティ製ライブラリを表示する */
export function LicensesPage() {
  return (
    <div className="game-container licenses-page">
      <header className="game-screen__head licenses-head">
        <div>
          <p className="eyebrow">SETTINGS / LICENSES</p>
          <h1 className="game-screen__title">OSSライセンス</h1>
          <p className="settings-lead">
            Tasmate が使用しているオープンソースソフトウェアの一覧です。直接依存しているサードパーティ製ライブラリを掲載しています。
          </p>
        </div>
        <Link to="/settings" className="btn btn--secondary licenses-back">
          設定に戻る
        </Link>
      </header>

      <Card title={`使用ライブラリ（${webLicenseEntries.length}件）`}>
        <ul className="license-list">
          {webLicenseEntries.map((entry) => (
            <li key={`${entry.name}@${entry.version}`} className="license-item">
              <div className="license-item__head">
                <div className="license-item__title">
                  <strong>{entry.name}</strong>
                  <span className="license-item__version">v{entry.version}</span>
                </div>
                <Badge tone="neutral">{entry.license}</Badge>
              </div>

              {entry.repository !== null && (
                <a
                  className="license-item__link"
                  href={entry.repository}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  リポジトリ
                </a>
              )}

              {entry.licenseText !== null ? (
                <details className="license-item__details">
                  <summary>ライセンス全文を表示</summary>
                  <pre className="license-item__text">{entry.licenseText}</pre>
                </details>
              ) : (
                <p className="settings-note license-item__missing">
                  ライセンス全文はパッケージに同梱されていません。リポジトリを参照してください。
                </p>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
