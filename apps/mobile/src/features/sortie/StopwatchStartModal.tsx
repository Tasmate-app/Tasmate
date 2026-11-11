import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DESTINATIONS, activeCategories } from '@tasmate/core';
import { useMobileAppStore } from '../../stores/appStore';
import { partyEfficiencyMap, partyTotalEfficiency } from '../../lib/party';
import { FormField, GameButton, GameTextInput, ModalSheet } from '../../ui';
import { colors, fontSize, radius, spacing } from '../../theme/tokens';
import { CategoryPicker, type CategorySelection } from '../taxonomy/CategoryPicker';
import { DestinationPicker } from './DestinationPicker';
import { PartyPicker } from './PartyPicker';

interface StopwatchStartModalProps {
  open: boolean;
  onClose: () => void;
}

/** 内容を設定したストップウォッチタスクを、その場で開始するモーダル */
export function StopwatchStartModal({ open, onClose }: StopwatchStartModalProps) {
  const characters = useMobileAppStore((s) => s.characters);
  const startStopwatchTask = useMobileAppStore((s) => s.startStopwatchTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selection, setSelection] = useState<CategorySelection>({
    categoryId: '',
    subCategoryId: '',
  });
  const [destinationId, setDestinationId] = useState(DESTINATIONS[0].id);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setSelection({
      categoryId: activeCategories(useMobileAppStore.getState().categories)[0]?.id ?? '',
      subCategoryId: '',
    });
    setDestinationId(DESTINATIONS[0].id);
    setSelectedIds(characters[0] !== undefined ? [characters[0].definitionId] : []);
    setError(null);
  }, [open, characters]);

  const destination = DESTINATIONS.find((item) => item.id === destinationId) ?? DESTINATIONS[0];
  const efficiencyById = useMemo(
    () => partyEfficiencyMap(characters, destination),
    [characters, destination],
  );
  const totalEfficiency = partyTotalEfficiency(efficiencyById, selectedIds);

  const toggleCharacter = (definitionId: string) => {
    setSelectedIds((current) =>
      current.includes(definitionId)
        ? current.filter((id) => id !== definitionId)
        : [...current, definitionId],
    );
  };

  const handleStart = () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle === '') {
      setError('タスク名を入力してください。');
      return;
    }
    if (selectedIds.length === 0) {
      setError('派遣する仲間を1人以上選んでください。');
      return;
    }
    const sessionId = startStopwatchTask(
      {
        title: trimmedTitle,
        description: description.trim(),
        category: '',
        categoryId: selection.categoryId === '' ? undefined : selection.categoryId,
        subCategoryId: selection.subCategoryId === '' ? undefined : selection.subCategoryId,
      },
      destinationId,
      selectedIds,
    );
    if (sessionId === null) {
      setError('計測を開始できませんでした。進行中の作業がないか確認してください。');
      return;
    }
    onClose();
  };

  return (
    <ModalSheet
      visible={open}
      title="ストップウォッチで開始"
      subtitle="予定時間を決めず、今から経過時間を計測します"
      onClose={onClose}
    >
      <FormField label="タスク名（必須）">
        <GameTextInput
          value={title}
          onChangeText={setTitle}
          placeholder="例：数学の問題集 p.40-50"
          maxLength={100}
        />
      </FormField>

      <FormField label="内容・メモ">
        <GameTextInput
          value={description}
          onChangeText={setDescription}
          placeholder="例：関数の応用問題を解く"
          maxLength={500}
          multiline
        />
      </FormField>

      <CategoryPicker value={selection} onChange={setSelection} />

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>計測方式</Text>
          <Text style={styles.summaryValue}>ストップウォッチ</Text>
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

      <DestinationPicker value={destinationId} onChange={setDestinationId} />
      <PartyPicker
        characters={characters}
        destination={destination}
        selectedIds={selectedIds}
        onToggle={toggleCharacter}
      />

      {error !== null && <Text style={styles.error}>{error}</Text>}

      <GameButton
        label={
          selectedIds.length === 0 ? '仲間を選んでください' : 'ストップウォッチで開始'
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
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '700',
    lineHeight: 20,
  },
});
