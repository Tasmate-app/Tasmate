import type { ReactNode } from 'react';

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'running'
  | 'paused'
  | 'success'
  | 'warning'
  | 'danger'
  | 'gold'
  | 'accent'
  | 'pink';

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: '',
  primary: ' badge--primary',
  running: ' badge--running',
  paused: ' badge--paused',
  success: ' badge--success',
  warning: ' badge--warning',
  danger: ' badge--danger',
  gold: ' badge--gold',
  accent: ' badge--accent',
  pink: ' badge--pink',
};

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}

/** 状態表示バッジ */
export function Badge({ tone = 'neutral', dot = false, children }: BadgeProps) {
  return (
    <span className={`badge${TONE_CLASS[tone]}`}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
