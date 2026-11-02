import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius } from '../theme/tokens';

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

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
}

const TONES: Record<BadgeTone, { background: string; color: string; border: string }> = {
  neutral: { background: colors.surfaceAlt, color: colors.textMuted, border: colors.border },
  primary: { background: colors.primarySoft, color: colors.primaryDark, border: colors.borderStrong },
  running: { background: colors.successSoft, color: colors.success, border: '#a9ecd1' },
  paused: { background: colors.warningSoft, color: colors.warning, border: '#f4d28b' },
  success: { background: colors.successSoft, color: colors.success, border: '#a9ecd1' },
  warning: { background: colors.warningSoft, color: colors.warning, border: '#f4d28b' },
  danger: { background: colors.dangerSoft, color: colors.danger, border: '#f5b5c4' },
  gold: { background: colors.goldSoft, color: '#9b6100', border: '#f0d18c' },
  accent: { background: colors.accentSoft, color: colors.accent, border: '#cfc7ff' },
  pink: { background: colors.pinkSoft, color: '#c13d74', border: '#ffc3da' },
};

export function Badge({ label, tone = 'neutral', dot = true }: BadgeProps) {
  const palette = TONES[tone];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.background, borderColor: palette.border },
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: palette.color }]} />}
      <Text style={[styles.label, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.85,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
});
