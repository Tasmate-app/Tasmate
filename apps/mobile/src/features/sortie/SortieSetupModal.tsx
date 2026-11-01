import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Task } from '@tasmate/types';
import {
  CHARACTER_DEFINITIONS,
  DESTINATIONS,
  MATERIAL_NAMES,
  characterEfficiency,
} from '@tasmate/core';
import { useMobileAppStore } from '../../stores/appStore';
import { Badge, GameButton, ModalSheet, ProgressBar } from '../../ui';
import { attributePalette, colors, fontSize, radius, spacing } from '../../theme/tokens';

interface SortieSetupModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
}

export function SortieSetupModal({ open, task, onClose }: SortieSetupModalProps) {
  const characters = useMobileAppStore((s) => s.characters);
  const startSession = useMobileAppStore((s) => s.startSession);
  const [destinationId, setDestinationId] = useState(DESTINATIONS[0].id);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setDestinationId(DESTINATIONS[0].id);
    setSelectedIds(characters[0] !== undefined ? [characters[0].definitionId] : []);
  }, [open, task?.id, characters]);

  const destination = DESTINATIONS.find((item) => item.id === destinationId) ?? DESTINATIONS[0];
  const efficiencyById = useMemo(() => {
    const map = new Map<string, number>();
    for (const owned of characters) {
      const definition = CHARACTER_DEFINITIONS.find((item) => item.id === owned.definitionId);
      if (definition === undefined) continue;
      map.set(owned.definitionId, characterEfficiency(owned, definition, destination));
    }
    return map;
  }, [characters, destination]);
  const totalEfficiency = selectedIds.reduce(
    (sum, id) => sum + (efficiencyById.get(id) ?? 0),
    0,
  );

  if (task === null) return null;

  const toggleCharacter = (definitionId: string) => {
    setSelectedIds((current) =>
      current.includes(definitionId)
        ? current.filter((id) => id !== definitionId)
        : [...current, definitionId],
    );
  };

  const handleStart = () => {
    if (selectedIds.length === 0) return;
    startSession(task.id, destinationId, selectedIds);
    onClose();
  };

  return (
    <ModalSheet
      visible={open}
      title="出撃準備"
      subtitle={task.title}
      onClose={onClose}
    >
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>予定時間</Text>
          <Text style={styles.summaryValue}>{task.estimatedMinutes}分</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>編成人数</Text>
          <Text style={styles.summaryValue}>{selectedIds.length}人</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>収集効率</Text>
          <Text style={styles.summaryValue}>{totalEfficiency.toFixed(1)}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>探索先</Text>
      <View style={styles.destinations}>
        {DESTINATIONS.map((item) => {
          const selected = item.id === destinationId;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setDestinationId(item.id)}
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
              onPress={() => toggleCharacter(owned.definitionId)}
              style={({ pressed }) => [
                styles.character,
                selected ? styles.characterSelected : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: palette.soft, borderColor: palette.color },
                ]}
              >
                <Text style={[styles.avatarText, { color: palette.color }]}>
                  {palette.glyph}
                </Text>
              </View>
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

      <GameButton
        label={selectedIds.length === 0 ? '仲間を選んでください' : '出撃して作業開始'}
        onPress={handleStart}
        disabled={selectedIds.length === 0}
        size="lg"
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  summaryValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '900',
    marginTop: 2,
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: '900',
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
