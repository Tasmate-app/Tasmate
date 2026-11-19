import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RecurrenceRule } from '@tasmate/types';
import {
  WEEKDAY_LABELS,
  activeCategories,
  isValidDateKey,
  isValidTime,
  isValidTimeRange,
  toDateKey,
} from '@tasmate/core';
import { useMobileAppStore } from '../../stores/appStore';
import { ChipGroup, FormField, GameButton, GameTextInput, ModalSheet } from '../../ui';
import { CategoryPicker, type CategorySelection } from '../taxonomy/CategoryPicker';
import { colors, fontSize, radius, spacing } from '../../theme/tokens';

interface RecurrenceEditorModalProps {
  open: boolean;
  rule?: RecurrenceRule;
  onClose: () => void;
}

const DAY_OPTIONS = WEEKDAY_LABELS.map((label, index) => ({
  value: String(index + 1),
  label,
}));

const ALL_DAY_VALUES = DAY_OPTIONS.map((option) => option.value);

export function RecurrenceEditorModal({ open, rule, onClose }: RecurrenceEditorModalProps) {
  const createRecurrenceRule = useMobileAppStore((s) => s.createRecurrenceRule);
  const updateRecurrenceRule = useMobileAppStore((s) => s.updateRecurrenceRule);
  const deleteRecurrenceRule = useMobileAppStore((s) => s.deleteRecurrenceRule);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selection, setSelection] = useState<CategorySelection>({
    categoryId: '',
    subCategoryId: '',
  });
  const [estimatedMinutes, setEstimatedMinutes] = useState('25');
  const [days, setDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveUntil, setEffectiveUntil] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(rule?.title ?? '');
    setDescription(rule?.description ?? '');
    setSelection({
      categoryId:
        rule?.categoryId ??
        activeCategories(useMobileAppStore.getState().categories)[0]?.id ??
        '',
      subCategoryId: rule?.subCategoryId ?? '',
    });
    setEstimatedMinutes(String(rule?.estimatedMinutes ?? 25));
    setDays((rule?.daysOfWeek ?? [1]).map(String));
    setStartTime(rule?.startTime ?? '');
    setEndTime(rule?.endTime ?? '');
    setEffectiveFrom(rule?.effectiveFrom ?? toDateKey(new Date()));
    setEffectiveUntil(rule?.effectiveUntil ?? '');
    setError(null);
  }, [open, rule]);

  const toggleDay = (value: string) => {
    setDays((current) =>
      current.includes(value)
        ? current.filter((day) => day !== value)
        : [...current, value].sort((a, b) => Number(a) - Number(b)),
    );
  };

  const allDaysSelected = days.length === ALL_DAY_VALUES.length;

  const toggleAllDays = () => {
    setDays((current) =>
      current.length === ALL_DAY_VALUES.length ? [] : [...ALL_DAY_VALUES],
    );
  };

  const handleSave = () => {
    if (title.trim() === '') {
      setError('予定名を入力してください。');
      return;
    }
    const minutes = Number(estimatedMinutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 480) {
      setError('予定時間は1〜480分の範囲で入力してください。');
      return;
    }
    if (days.length === 0) {
      setError('繰り返す曜日を1つ以上選んでください。');
      return;
    }
    if (!isValidDateKey(effectiveFrom)) {
      setError('開始日は YYYY-MM-DD 形式で入力してください。');
      return;
    }
    const until = effectiveUntil.trim();
    if (until !== '' && !isValidDateKey(until)) {
      setError('終了日は YYYY-MM-DD 形式で入力してください。');
      return;
    }
    if (until !== '' && until < effectiveFrom) {
      setError('終了日は開始日以降にしてください。');
      return;
    }
    const start = startTime.trim();
    const end = endTime.trim();
    if ((start === '') !== (end === '')) {
      setError('開始時刻と終了時刻は両方入力してください。');
      return;
    }
    if (start !== '' && !isValidTime(start)) {
      setError('開始時刻は HH:mm 形式で入力してください。');
      return;
    }
    if (end !== '' && !isValidTime(end)) {
      setError('終了時刻は HH:mm 形式で入力してください。');
      return;
    }
    if (!isValidTimeRange(start === '' ? undefined : start, end === '' ? undefined : end)) {
      setError('終了時刻は開始時刻より後にしてください。');
      return;
    }

    const input = {
      title: title.trim(),
      description: description.trim(),
      category: '',
      categoryId: selection.categoryId === '' ? undefined : selection.categoryId,
      subCategoryId: selection.subCategoryId === '' ? undefined : selection.subCategoryId,
      estimatedMinutes: Math.floor(minutes),
      daysOfWeek: days.map(Number),
      startTime: start === '' ? undefined : start,
      endTime: end === '' ? undefined : end,
      effectiveFrom,
      effectiveUntil: until === '' ? undefined : until,
    };

    if (rule !== undefined) {
      updateRecurrenceRule(rule.id, input);
    } else {
      const id = createRecurrenceRule(input);
      if (id === '') {
        setError('繰り返し予定を作成できませんでした。入力内容を確認してください。');
        return;
      }
    }
    onClose();
  };

  const handleDelete = () => {
    if (rule === undefined) return;
    Alert.alert(
      '繰り返し予定を削除',
      'このルールと、これから先の未完了の予定を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            deleteRecurrenceRule(rule.id);
            onClose();
          },
        },
      ],
    );
  };

  return (
    <ModalSheet
      visible={open}
      title={rule === undefined ? '繰り返し予定を追加' : '繰り返し予定を編集'}
      subtitle="毎週決まった曜日に自動で予定を作成します"
      onClose={onClose}
    >
      <FormField label="予定名（必須）">
        <GameTextInput
          value={title}
          onChangeText={setTitle}
          placeholder="例：英単語の復習"
          maxLength={100}
        />
      </FormField>

      <FormField label="内容・メモ">
        <GameTextInput
          value={description}
          onChangeText={setDescription}
          placeholder="例：単語帳 p.20まで"
          maxLength={500}
          multiline
        />
      </FormField>

      <CategoryPicker value={selection} onChange={setSelection} />

      <FormField label="予定時間（分）">
        <GameTextInput
          value={estimatedMinutes}
          onChangeText={setEstimatedMinutes}
          keyboardType="number-pad"
          maxLength={3}
        />
      </FormField>

      <FormField label="繰り返す曜日">
        <View style={styles.dayPicker}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              allDaysSelected ? 'すべての曜日の選択を解除' : 'すべての曜日を選択'
            }
            accessibilityState={{ selected: allDaysSelected }}
            onPress={toggleAllDays}
            style={({ pressed }) => [
              styles.allDaysChip,
              allDaysSelected ? styles.allDaysChipSelected : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              style={[styles.allDaysLabel, allDaysSelected ? styles.allDaysLabelSelected : null]}
            >
              すべて
            </Text>
          </Pressable>
          <ChipGroup options={DAY_OPTIONS} selected={days} onToggle={toggleDay} multi />
        </View>
      </FormField>

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <FormField label="開始時刻">
            <GameTextInput
              value={startTime}
              onChangeText={setStartTime}
              placeholder="19:00"
              maxLength={5}
            />
          </FormField>
        </View>
        <View style={styles.timeField}>
          <FormField label="終了時刻">
            <GameTextInput
              value={endTime}
              onChangeText={setEndTime}
              placeholder="19:25"
              maxLength={5}
            />
          </FormField>
        </View>
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <FormField label="開始日">
            <GameTextInput
              value={effectiveFrom}
              onChangeText={setEffectiveFrom}
              placeholder="2026-11-01"
              autoCapitalize="none"
            />
          </FormField>
        </View>
        <View style={styles.timeField}>
          <FormField label="終了日（任意）">
            <GameTextInput
              value={effectiveUntil}
              onChangeText={setEffectiveUntil}
              placeholder="未設定"
              autoCapitalize="none"
            />
          </FormField>
        </View>
      </View>

      {error !== null && <Text style={styles.error}>{error}</Text>}

      <GameButton
        label={rule === undefined ? '繰り返し予定を追加' : '変更を保存'}
        onPress={handleSave}
        size="lg"
      />
      {rule !== undefined && (
        <GameButton label="この繰り返しを削除" onPress={handleDelete} variant="danger" />
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  dayPicker: {
    gap: spacing.sm,
  },
  allDaysChip: {
    alignSelf: 'flex-start',
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  allDaysChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderBottomWidth: 2,
  },
  allDaysLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  allDaysLabelSelected: {
    color: colors.primaryDark,
  },
  pressed: {
    opacity: 0.75,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeField: {
    flex: 1,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '700',
    lineHeight: 20,
  },
});
