import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, radius, shadows, spacing } from '../theme/tokens';

interface PanelProps {
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
  accentColor?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Panel({
  title,
  eyebrow,
  right,
  accentColor,
  children,
  style,
}: PanelProps) {
  return (
    <View style={[styles.panel, style]}>
      {accentColor !== undefined && (
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
      )}
      {(title !== undefined || eyebrow !== undefined || right !== undefined) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {eyebrow !== undefined && <Text style={styles.eyebrow}>{eyebrow}</Text>}
            {title !== undefined && <Text style={styles.title}>{title}</Text>}
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
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
  },
  eyebrow: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  body: {
    gap: spacing.sm,
  },
});
