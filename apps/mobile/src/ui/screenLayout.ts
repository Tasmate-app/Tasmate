import type { ViewStyle } from 'react-native';
import { spacing } from '../theme/tokens';

/** タブレットでも1カラムを保ち、読みやすい行長に収める */
export const SCREEN_MAX_WIDTH = 720;

/**
 * 画面のスクロール内容に共通する枠。
 * 上端・下端の余白だけは HUD や Safe Area に応じて各画面で上書きする。
 */
export const screenContent: ViewStyle = {
  width: '100%',
  maxWidth: SCREEN_MAX_WIDTH,
  alignSelf: 'center',
  padding: spacing.lg,
  gap: spacing.md,
  paddingBottom: spacing.xxl,
};
