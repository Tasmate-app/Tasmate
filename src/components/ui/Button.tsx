import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

/** 共通ボタン */
export function Button({ variant = 'primary', type = 'button', ...rest }: ButtonProps) {
  const className = `btn${variant === 'secondary' ? ' btn--secondary' : ''}${variant === 'danger' ? ' btn--danger' : ''}`;
  return <button type={type} className={className} {...rest} />;
}
