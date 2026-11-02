import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, withAlpha } from '../theme/tokens';

interface StatTileProps {
  label: string;
  value: string;
  tone?: string;
  glyph?: string;
}

export function StatTile({ label, value, tone = colors.text, glyph }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <View style={[styles.mark, { backgroundColor: tone }]} />
      <View style={styles.labelRow}>
        {glyph !== undefined && (
          <View style={[styles.glyphBox, { backgroundColor: withAlpha(tone, 0.12) }]}>
            <Text style={[styles.glyph, { color: tone }]}>{glyph}</Text>
          </View>
        )}
        <Text style={styles.label}>{label}</Text>
      </View>
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
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  mark: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    opacity: 0.75,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  glyphBox: {
    width: 16,
    height: 16,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 9,
    fontWeight: '900',
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
