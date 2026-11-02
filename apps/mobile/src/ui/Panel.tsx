import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '../theme/tokens';

export type PanelTone = 'default' | 'primary' | 'secondary' | 'accent' | 'gold' | 'success' | 'danger';

interface PanelProps {
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  right?: ReactNode;
  accentColor?: string;
  tone?: PanelTone;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const TONE_COLORS: Record<PanelTone, string> = {
  default: colors.primary,
  primary: colors.primary,
  secondary: colors.secondary,
  accent: colors.accent,
  gold: colors.gold,
  success: colors.success,
  danger: colors.danger,
};

export function Panel({
  title,
  eyebrow,
  subtitle,
  right,
  accentColor,
  tone = 'default',
  children,
  style,
}: PanelProps) {
  const accent = accentColor ?? TONE_COLORS[tone];
  return (
    <View style={[styles.panel, style]}>
      <View pointerEvents="none" style={styles.sheen} />
      <View pointerEvents="none" style={[styles.accent, { backgroundColor: accent }]} />
      {(title !== undefined || eyebrow !== undefined || right !== undefined) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {eyebrow !== undefined && (
              <View style={styles.eyebrowRow}>
                <View style={[styles.eyebrowDot, { backgroundColor: accent }]} />
                <Text style={[styles.eyebrow, { color: accent }]}>{eyebrow}</Text>
              </View>
            )}
            {title !== undefined && <Text style={styles.title}>{title}</Text>}
            {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {right}
        </View>
      )}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  sheen: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    right: -78,
    top: -100,
    backgroundColor: colors.primaryPale,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: spacing.lg,
    bottom: spacing.lg,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  eyebrowDot: {
    width: 12,
    height: 3,
    borderRadius: 2,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  body: {
    gap: spacing.md,
  },
});
