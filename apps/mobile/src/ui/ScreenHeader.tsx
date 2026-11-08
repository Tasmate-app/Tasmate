import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme/tokens';

interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({ eyebrow, title, subtitle, right, style }: ScreenHeaderProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.text}>
        <View style={styles.eyebrowRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✦</Text>
          </View>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {subtitle !== undefined && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '900',
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '900',
    letterSpacing: 0.2,
    lineHeight: 32,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: 1,
  },
});
