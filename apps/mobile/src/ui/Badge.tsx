import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius } from '../theme/tokens';

type BadgeTone = 'neutral' | 'primary' | 'running' | 'paused' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

const TONES: Record<BadgeTone, { background: string; color: string; border: string }> = {
  neutral: { background: colors.surfaceAlt, color: colors.textMuted, border: colors.border },
  primary: { background: colors.primarySoft, color: colors.primaryDark, border: colors.borderStrong },
  running: { background: colors.successSoft, color: colors.success, border: '#a9ecd1' },
  paused: { background: colors.warningSoft, color: colors.warning, border: '#f4d28b' },
  success: { background: colors.successSoft, color: colors.success, border: '#a9ecd1' },
  warning: { background: colors.warningSoft, color: colors.warning, border: '#f4d28b' },
  danger: { background: colors.dangerSoft, color: colors.danger, border: '#f5b5b5' },
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const palette = TONES[tone];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.background, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.label, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
});
