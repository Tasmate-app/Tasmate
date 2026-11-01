import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

interface StatTileProps {
  label: string;
  value: string;
  tone?: string;
}

export function StatTile({ label, value, tone = colors.text }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <View style={[styles.mark, { backgroundColor: tone }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: tone }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: 84,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mark: {
    width: 16,
    height: 3,
    borderRadius: 2,
    opacity: 0.75,
    marginBottom: 4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 1,
  },
});
