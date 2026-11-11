import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DESTINATIONS, MATERIAL_NAMES } from '@tasmate/core';
import { colors, fontSize, radius, spacing } from '../../theme/tokens';

interface DestinationPickerProps {
  value: string;
  onChange: (destinationId: string) => void;
}

export function DestinationPicker({ value, onChange }: DestinationPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>探索先</Text>
      <View style={styles.destinations}>
        {DESTINATIONS.map((item) => {
          const selected = item.id === value;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(item.id)}
              style={({ pressed }) => [
                styles.destination,
                selected ? styles.destinationSelected : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.destinationName, selected ? styles.selectedText : null]}>
                {item.name}
              </Text>
              <Text style={styles.destinationDescription}>{item.description}</Text>
              <View style={styles.materialRow}>
                {Object.entries(item.availableMaterials).map(([materialId, ratio]) => (
                  <Text key={materialId} style={styles.materialText}>
                    {MATERIAL_NAMES[materialId] ?? materialId} {Math.round((ratio ?? 0) * 100)}%
                  </Text>
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  destinations: {
    gap: spacing.sm,
  },
  destination: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: 3,
  },
  destinationSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryPale,
  },
  destinationName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  selectedText: {
    color: colors.primaryDark,
  },
  destinationDescription: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
  materialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  materialText: {
    color: colors.primaryDark,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
});
