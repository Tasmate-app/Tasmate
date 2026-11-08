import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme/tokens';

export interface ChipOption {
  value: string;
  label: string;
  meta?: string;
  color?: string;
}

interface ChipGroupProps {
  options: ChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
  multi?: boolean;
  accessibilityLabel?: string;
}

export function ChipGroup({
  options,
  selected,
  onToggle,
  multi = false,
  accessibilityLabel,
}: ChipGroupProps) {
  return (
    <View style={styles.wrap} accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityLabel={option.label}
            accessibilityState={{ checked: isSelected }}
            onPress={() => onToggle(option.value)}
            style={({ pressed }) => [
              styles.chip,
              isSelected ? styles.chipSelected : null,
              option.color !== undefined && isSelected
                ? { borderColor: option.color }
                : null,
              pressed ? styles.chipPressed : null,
            ]}
          >
            {option.color !== undefined && (
              <View style={[styles.dot, { backgroundColor: option.color }]} />
            )}
            <Text style={[styles.label, isSelected ? styles.labelSelected : null]}>
              {option.label}
            </Text>
            {option.meta !== undefined && (
              <Text style={styles.meta}>{option.meta}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderBottomWidth: 2,
  },
  chipPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
