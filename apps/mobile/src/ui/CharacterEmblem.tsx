import type { CharacterAttribute } from '@tasmate/types';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { attributePalette, colors, radius } from '../theme/tokens';

interface CharacterEmblemProps {
  attribute?: CharacterAttribute;
  size?: number;
  selected?: boolean;
  level?: number;
  style?: StyleProp<ViewStyle>;
}

export function CharacterEmblem({
  attribute = 'none',
  size = 56,
  selected = false,
  level,
  style,
}: CharacterEmblemProps) {
  const palette = attributePalette[attribute];
  const ring = Math.max(6, Math.round(size * 0.14));

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.soft,
          borderColor: palette.color,
          padding: ring,
        },
        selected ? styles.selected : null,
        style,
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            borderRadius: size / 2,
            borderColor: `${palette.color}44`,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Text style={[styles.glyph, { color: palette.color, fontSize: size * 0.4 }]}>
          {palette.glyph}
        </Text>
      </View>
      <View style={[styles.spark, { backgroundColor: palette.color }]} />
      {level !== undefined && (
        <View style={[styles.level, { borderColor: palette.color }]}>
          <Text style={[styles.levelText, { color: palette.deep }]}>Lv.{level}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  selected: {
    borderWidth: 3,
    shadowColor: colors.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  inner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  glyph: {
    fontWeight: '900',
  },
  spark: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 3,
    right: 6,
    opacity: 0.75,
  },
  level: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '900',
  },
});
