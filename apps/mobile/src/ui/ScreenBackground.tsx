import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';

interface ScreenBackgroundProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenBackground({ children, style }: ScreenBackgroundProps) {
  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={styles.decor}>
        <View style={[styles.blob, styles.blobSky]} />
        <View style={[styles.blob, styles.blobMint]} />
        <View style={[styles.blob, styles.blobLilac]} />
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
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobSky: {
    width: 240,
    height: 240,
    top: -110,
    right: -70,
    backgroundColor: colors.decorationSky,
  },
  blobMint: {
    width: 190,
    height: 190,
    top: 210,
    left: -110,
    backgroundColor: colors.decorationMint,
  },
  blobLilac: {
    width: 210,
    height: 210,
    bottom: 60,
    right: -120,
    backgroundColor: colors.decorationLilac,
  },
  spark: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
    opacity: 0.7,
  },
  sparkOne: {
    top: 92,
    left: 38,
  },
  sparkTwo: {
    top: 170,
    right: 48,
    width: 4,
    height: 4,
  },
  sparkThree: {
    bottom: 210,
    left: 64,
    width: 5,
    height: 5,
  },
});
