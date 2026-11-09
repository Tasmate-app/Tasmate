import { cssVariables } from '@tasmate/design-tokens';

/** 共有デザイントークンを CSS 変数として :root に適用する */
export function applyDesignTokens(): void {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(cssVariables)) {
    root.style.setProperty(name, value);
  }
}
