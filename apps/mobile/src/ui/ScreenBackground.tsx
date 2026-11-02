import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, withAlpha } from '../theme/tokens';

interface ScreenBackgroundProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const DOTS = [
  { top: '9%', left: '12%', size: 5, opacity: 0.5 },
  { top: '16%', right: '18%', size: 4, opacity: 0.45 },
  { top: '31%', left: '7%', size: 3, opacity: 0.4 },
  { top: '43%', right: '9%', size: 6, opacity: 0.32 },
  { top: '58%', left: '16%', size: 4, opacity: 0.35 },
  { top: '72%', right: '14%', size: 3, opacity: 0.4 },
  { top: '84%', left: '9%', size: 5, opacity: 0.3 },
] as const;

export function ScreenBackground({ children, style }: ScreenBackgroundProps) {
  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={styles.decor}>
        <View style={styles.skyBand} />
        <View style={[styles.blob, styles.blobSky]} />
        <View style={[styles.blob, styles.blobMint]} />
        <View style={[styles.blob, styles.blobLilac]} />
        <View style={[styles.blob, styles.blobGold]} />
        <View style={[styles.ring, styles.ringOne]} />
        <View style={[styles.ring, styles.ringTwo]} />
        {DOTS.map((dot, index) => (
          <View
            key={`dot-${index}`}
            style={[
              styles.dot,
              {
                top: dot.top,
                left: 'left' in dot ? dot.left : undefined,
                right: 'right' in dot ? dot.right : undefined,
                width: dot.size,
                height: dot.size,
                borderRadius: dot.size / 2,
                opacity: dot.opacity,
              },
            ]}
          />
        ))}
        <View style={[styles.spark, styles.sparkOne]} />
        <View style={[styles.spark, styles.sparkTwo]} />
        <View style={[styles.spark, styles.sparkThree]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  decor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  skyBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: withAlpha(colors.sky, 0.18),
    borderBottomLeftRadius: 120,
    borderBottomRightRadius: 120,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobSky: {
    width: 260,
    height: 260,
    top: -120,
    right: -80,
    backgroundColor: colors.decorationSky,
  },
  blobMint: {
    width: 200,
    height: 200,
    top: 220,
    left: -120,
    backgroundColor: colors.decorationMint,
  },
  blobLilac: {
    width: 220,
    height: 220,
    bottom: 60,
    right: -130,
    backgroundColor: colors.decorationLilac,
  },
  blobGold: {
    width: 150,
    height: 150,
    bottom: 190,
    left: -80,
    backgroundColor: colors.decorationGold,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.5),
  },
  ringOne: {
    width: 180,
    height: 180,
    top: 70,
    right: -70,
  },
  ringTwo: {
    width: 110,
    height: 110,
    bottom: 140,
    left: -40,
  },
  dot: {
    position: 'absolute',
    backgroundColor: colors.white,
  },
  spark: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 2,
    backgroundColor: colors.white,
    opacity: 0.72,
    transform: [{ rotate: '45deg' }],
  },
  sparkOne: {
    top: 96,
    left: 40,
  },
  sparkTwo: {
    top: 178,
    right: 50,
    width: 4,
    height: 4,
  },
  sparkThree: {
    bottom: 216,
    left: 66,
    width: 5,
    height: 5,
  },
});
