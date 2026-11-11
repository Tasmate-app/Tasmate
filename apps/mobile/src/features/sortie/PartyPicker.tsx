import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Destination, OwnedCharacter } from '@tasmate/types';
import { CHARACTER_DEFINITIONS } from '@tasmate/core';
import { partyEfficiencyMap } from '../../lib/party';
import { attributePalette, colors, fontSize, radius, spacing } from '../../theme/tokens';
import { Badge, CharacterEmblem, ProgressBar } from '../../ui';

interface PartyPickerProps {
  characters: OwnedCharacter[];
  destination: Destination;
  selectedIds: string[];
  onToggle: (definitionId: string) => void;
}

export function PartyPicker({
  characters,
  destination,
  selectedIds,
  onToggle,
}: PartyPickerProps) {
  const efficiencyById = useMemo(
    () => partyEfficiencyMap(characters, destination),
    [characters, destination],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>派遣する仲間</Text>
      <Text style={styles.hint}>
        探索先と属性が一致すると収集効率がアップします。タップで編成を切り替えます。
      </Text>
      <View style={styles.partyList}>
        {characters.map((owned) => {
          const definition = CHARACTER_DEFINITIONS.find(
            (item) => item.id === owned.definitionId,
          );
          const attribute = definition?.attribute ?? 'none';
          const palette = attributePalette[attribute];
          const selected = selectedIds.includes(owned.definitionId);
          const affinity = destination.recommendedAttributes.includes(attribute);
          return (
            <Pressable
              key={owned.definitionId}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => onToggle(owned.definitionId)}
              style={({ pressed }) => [
                styles.character,
                selected ? styles.characterSelected : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <CharacterEmblem attribute={attribute} size={44} selected={selected} />
              <View style={styles.characterBody}>
                <View style={styles.characterNameRow}>
                  <Text style={styles.characterName}>
                    {definition?.name ?? owned.definitionId}
                  </Text>
                  <Badge label={`Lv.${owned.level}`} tone="neutral" />
                </View>
                <Text style={styles.characterMeta}>
                  効率 {(efficiencyById.get(owned.definitionId) ?? 0).toFixed(1)}
                  {affinity ? ' / 相性ボーナス' : ''}
                </Text>
                <ProgressBar
                  value={Math.min(100, (owned.experience / Math.max(1, owned.level * 100)) * 100)}
                  color={palette.color}
                  height={5}
                />
              </View>
              <Text style={[styles.check, selected ? styles.checkOn : null]}>
                {selected ? '✓' : '＋'}
              </Text>
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
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
  partyList: {
    gap: spacing.sm,
  },
  character: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  characterSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryPale,
  },
  characterBody: {
    flex: 1,
    gap: 3,
  },
  characterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  characterName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  characterMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  check: {
    color: colors.textSubtle,
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
  checkOn: {
    color: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
});
