import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '../theme/tokens';

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
      <View pointerEvents="none" style={styles.sheen} />
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
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  sheen: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -70,
    top: -90,
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
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  body: {
    gap: spacing.sm,
  },
});
