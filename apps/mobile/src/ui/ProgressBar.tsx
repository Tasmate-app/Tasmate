import { StyleSheet, View } from 'react-native';
import { colors, radius, withAlpha } from '../theme/tokens';

interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
}

export function ProgressBar({ value, color = colors.primary, height = 10 }: ProgressBarProps) {
  const clamped = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      >
        <View style={styles.gloss} />
      </View>
      <View pointerEvents="none" style={styles.ticks}>
        <View style={[styles.tick, { backgroundColor: withAlpha(colors.white, 0.35) }]} />
        <View style={[styles.tick, { backgroundColor: withAlpha(colors.white, 0.35) }]} />
        <View style={[styles.tick, { backgroundColor: withAlpha(colors.white, 0.35) }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
  },
  gloss: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: 1,
    height: '38%',
    borderRadius: radius.pill,
    backgroundColor: colors.highlight,
    opacity: 0.6,
  },
  ticks: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '25%',
    right: '25%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tick: {
    width: 1,
    height: '100%',
  },
});
