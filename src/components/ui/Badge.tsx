/** 状態表示バッジ */
export function Badge({ tone, children }: { tone?: 'running' | 'paused'; children: React.ReactNode }) {
  const className = `badge${tone === 'running' ? ' badge--running' : ''}${tone === 'paused' ? ' badge--paused' : ''}`;
  return <span className={className}>{children}</span>;
}
