import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme/tokens';

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.box}>
      <View style={styles.gem}>
        <View style={styles.gemInner}>
          <Text style={styles.gemText}>✦</Text>
        </View>
      </View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
  },
  gem: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    transform: [{ rotate: '8deg' }],
  },
  gemInner: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '-8deg' }],
  },
  gemText: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  text: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
});
