import type { ReactNode } from 'react';

/** 共通カード */
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title !== undefined && <h2>{title}</h2>}
      {children}
    </section>
  );
}
