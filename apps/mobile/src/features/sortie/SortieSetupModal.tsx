import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Task } from '@tasmate/types';
import { DESTINATIONS } from '@tasmate/core';
import { useMobileAppStore } from '../../stores/appStore';
import { partyEfficiencyMap, partyTotalEfficiency } from '../../lib/party';
import { GameButton, ModalSheet } from '../../ui';
import { colors, fontSize, radius, spacing } from '../../theme/tokens';
import { DestinationPicker } from './DestinationPicker';
import { PartyPicker } from './PartyPicker';

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
  const efficiencyById = useMemo(
    () => partyEfficiencyMap(characters, destination),
    [characters, destination],
  );
  const totalEfficiency = partyTotalEfficiency(efficiencyById, selectedIds);

  if (task === null) return null;

  const stopwatch = task.timerMode === 'stopwatch';

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
    <ModalSheet visible={open} title="出撃準備" subtitle={task.title} onClose={onClose}>
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>計測方式</Text>
          <Text style={styles.summaryValue}>
            {stopwatch ? 'ストップウォッチ' : `${task.estimatedMinutes}分`}
          </Text>
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

      {stopwatch && (
        <Text style={styles.hint}>予定時間なしで経過時間を計測します。</Text>
      )}

      <DestinationPicker value={destinationId} onChange={setDestinationId} />
      <PartyPicker
        characters={characters}
        destination={destination}
        selectedIds={selectedIds}
        onToggle={toggleCharacter}
      />

      <GameButton
        label={
          selectedIds.length === 0
            ? '仲間を選んでください'
            : stopwatch
              ? '計測を開始'
              : '出撃して作業開始'
        }
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
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
});
