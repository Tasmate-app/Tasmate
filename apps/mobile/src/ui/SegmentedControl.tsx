import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, radius, shadows, spacing } from '../theme/tokens';

export interface SegmentOption {
  value: string;
  label: string;
  meta?: string;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl({ options, value, onChange, style }: SegmentedControlProps) {
  return (
    <View style={[styles.track, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected ? styles.segmentSelected : null,
              pressed ? styles.pressed : null,
            ]}
          >
            {selected && <View style={styles.selectedMark} />}
            <Text style={[styles.label, selected ? styles.labelSelected : null]}>
              {option.label}
            </Text>
            {option.meta !== undefined && (
              <Text style={[styles.meta, selected ? styles.metaSelected : null]}>
                {option.meta}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  selectedMark: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.78,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  labelSelected: {
    color: colors.primaryDark,
  },
  meta: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '800',
  },
  metaSelected: {
    color: colors.primary,
  },
});
