import { Link } from 'react-router-dom';
import { PRIVACY_POLICY } from '@tasmate/core';

/** プライバシーポリシー画面。設定画面から遷移して全文を表示する */
export function PrivacyPolicyPage() {
  return (
    <div className="game-container legal-page">
      <header className="game-screen__head">
        <div>
          <p className="eyebrow">PRIVACY</p>
          <h1 className="game-screen__title">{PRIVACY_POLICY.title}</h1>
          <p className="legal-meta">最終更新日：{PRIVACY_POLICY.lastUpdated}</p>
        </div>
      </header>

      <article className="card legal-content">
        {PRIVACY_POLICY.intro.map((paragraph) => (
          <p key={paragraph} className="legal-intro">
            {paragraph}
          </p>
        ))}

        {PRIVACY_POLICY.sections.map((section) => (
          <section key={section.heading} className="legal-section">
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets !== undefined && (
              <ul>
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>

      <div className="legal-actions">
        <Link to="/settings" className="btn btn--secondary">
          設定に戻る
        </Link>
      </div>
    </div>
  );
}
