import type { CharacterAttribute } from '@tasmate/types';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { attributePalette, colors, radius, shadows, withAlpha } from '../theme/tokens';

interface CharacterPortraitProps {
  attribute?: CharacterAttribute;
  size?: number;
  level?: number;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SKIN = '#ffe4d2';

export function CharacterPortrait({
  attribute = 'none',
  size = 200,
  level,
  selected = false,
  style,
}: CharacterPortraitProps) {
  const palette = attributePalette[attribute];
  const height = size * 1.08;
  const dot = (scale: number) => Math.max(2, size * scale);

  return (
    <View
      style={[
        styles.root,
        { width: size, height },
        selected ? shadows.card : null,
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            left: size * 0.15,
            top: size * 0.04,
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: size * 0.35,
            borderColor: withAlpha(palette.color, 0.24),
            backgroundColor: withAlpha(palette.color, 0.07),
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.haloInner,
          {
            left: size * 0.235,
            top: size * 0.125,
            width: size * 0.53,
            height: size * 0.53,
            borderRadius: size * 0.265,
            borderColor: withAlpha(palette.color, 0.18),
          },
        ]}
      />
      <View
        style={[
          styles.floor,
          {
            left: size * 0.22,
            bottom: size * 0.015,
            width: size * 0.56,
            height: size * 0.11,
            borderRadius: size * 0.28,
            backgroundColor: withAlpha(palette.color, 0.18),
          },
        ]}
      />
      <View
        style={[
          styles.body,
          {
            left: size * 0.24,
            top: size * 0.47,
            width: size * 0.52,
            height: size * 0.43,
            borderTopLeftRadius: size * 0.26,
            borderTopRightRadius: size * 0.26,
            borderBottomLeftRadius: size * 0.12,
            borderBottomRightRadius: size * 0.12,
            backgroundColor: palette.soft,
            borderColor: withAlpha(palette.color, 0.4),
          },
        ]}
      >
        <View
          style={[
            styles.collar,
            {
              top: 0,
              width: size * 0.2,
              height: size * 0.1,
              borderBottomLeftRadius: size * 0.08,
              borderBottomRightRadius: size * 0.08,
              borderColor: withAlpha(palette.color, 0.22),
            },
          ]}
        />
        <View
          style={[
            styles.bodyLine,
            {
              top: size * 0.16,
              width: size * 0.1,
              height: size * 0.26,
              borderRadius: size * 0.05,
              backgroundColor: withAlpha(palette.color, 0.3),
            },
          ]}
        />
      </View>
      <View
        style={[
          styles.hairBack,
          {
            left: size * 0.315,
            top: size * 0.17,
            width: size * 0.37,
            height: size * 0.37,
            borderRadius: size * 0.185,
            backgroundColor: palette.color,
          },
        ]}
      />
      <View
        style={[
          styles.head,
          {
            left: size * 0.33,
            top: size * 0.25,
            width: size * 0.34,
            height: size * 0.33,
            borderRadius: size * 0.165,
            borderColor: withAlpha(palette.color, 0.35),
          },
        ]}
      >
        <View
          style={[
            styles.eye,
            {
              left: size * 0.085,
              top: size * 0.15,
              width: dot(0.028),
              height: dot(0.055),
            },
          ]}
        />
        <View
          style={[
            styles.eye,
            {
              right: size * 0.085,
              top: size * 0.15,
              width: dot(0.028),
              height: dot(0.055),
            },
          ]}
        />
        <View
          style={[
            styles.blush,
            {
              left: size * 0.055,
              top: size * 0.205,
              width: dot(0.045),
              height: dot(0.022),
            },
          ]}
        />
        <View
          style={[
            styles.blush,
            {
              right: size * 0.055,
              top: size * 0.205,
              width: dot(0.045),
              height: dot(0.022),
            },
          ]}
        />
        <View
          style={[
            styles.mouth,
            {
              left: size * 0.155,
              top: size * 0.235,
              width: dot(0.04),
              height: dot(0.013),
            },
          ]}
        />
      </View>
      <View
        style={[
          styles.fringe,
          {
            left: size * 0.31,
            top: size * 0.205,
            width: size * 0.38,
            height: size * 0.16,
            borderTopLeftRadius: size * 0.19,
            borderTopRightRadius: size * 0.19,
            borderBottomLeftRadius: size * 0.06,
            borderBottomRightRadius: size * 0.06,
            backgroundColor: palette.color,
          },
        ]}
      />
      <View
        style={[
          styles.sideHair,
          {
            left: size * 0.295,
            top: size * 0.285,
            width: size * 0.06,
            height: size * 0.22,
            borderRadius: size * 0.03,
            backgroundColor: palette.color,
          },
        ]}
      />
      <View
        style={[
          styles.sideHair,
          {
            right: size * 0.295,
            top: size * 0.285,
            width: size * 0.06,
            height: size * 0.22,
            borderRadius: size * 0.03,
            backgroundColor: palette.color,
          },
        ]}
      />
      <View
        style={[
          styles.crest,
          {
            right: size * 0.14,
            top: size * 0.28,
            width: size * 0.16,
            height: size * 0.16,
            borderRadius: size * 0.08,
            borderColor: withAlpha(palette.color, 0.35),
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Text style={[styles.crestGlyph, { color: palette.deep, fontSize: size * 0.075 }]}>
          {palette.glyph}
        </Text>
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.spark,
          {
            left: size * 0.13,
            top: size * 0.31,
            width: dot(0.035),
            height: dot(0.035),
            backgroundColor: palette.color,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.spark,
          {
            right: size * 0.12,
            top: size * 0.16,
            width: dot(0.045),
            height: dot(0.045),
            backgroundColor: colors.gold,
          },
        ]}
      />
      {level !== undefined && (
        <View
          style={[
            styles.level,
            {
              left: size * 0.36,
              bottom: 0,
              borderColor: palette.color,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Text style={[styles.levelText, { color: palette.deep }]}>Lv.{level}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    borderWidth: 2,
  },
  haloInner: {
    position: 'absolute',
    borderWidth: 1,
  },
  floor: {
    position: 'absolute',
  },
  body: {
    position: 'absolute',
    alignItems: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  collar: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderWidth: 1,
  },
  bodyLine: {
    position: 'absolute',
  },
  hairBack: {
    position: 'absolute',
  },
  head: {
    position: 'absolute',
    backgroundColor: SKIN,
    borderWidth: 2,
  },
  eye: {
    position: 'absolute',
    borderRadius: radius.pill,
    backgroundColor: '#243b5a',
  },
  blush: {
    position: 'absolute',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 127, 180, 0.45)',
  },
  mouth: {
    position: 'absolute',
    borderRadius: radius.pill,
    backgroundColor: '#d4768c',
  },
  fringe: {
    position: 'absolute',
  },
  sideHair: {
    position: 'absolute',
  },
  crest: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...shadows.soft,
  },
  crestGlyph: {
    fontWeight: '900',
  },
  spark: {
    position: 'absolute',
    borderRadius: radius.pill,
    opacity: 0.7,
  },
  level: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '900',
  },
});
