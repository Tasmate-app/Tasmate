import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { Task } from '@tasmate/types';
import {
  activeCategories,
  combineDateAndTime,
  isValidDateKey,
  isValidTime,
  isValidTimeRange,
  taskScheduledDateKey,
  toDateKey,
  addDaysToKey,
} from '@tasmate/core';
import { useMobileAppStore } from '../../stores/appStore';
import { FormField, GameButton, GameTextInput, ModalSheet } from '../../ui';
import { CategoryPicker, type CategorySelection } from '../taxonomy/CategoryPicker';
import { colors, fontSize, radius, spacing } from '../../theme/tokens';

interface TaskEditorModalProps {
  open: boolean;
  task?: Task;
  initialDate?: string;
  onClose: () => void;
}

export function TaskEditorModal({ open, task, initialDate, onClose }: TaskEditorModalProps) {
  const createTask = useMobileAppStore((s) => s.createTask);
  const updateTask = useMobileAppStore((s) => s.updateTask);
  const deleteTask = useMobileAppStore((s) => s.deleteTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selection, setSelection] = useState<CategorySelection>({
    categoryId: '',
    subCategoryId: '',
  });
  const [estimatedMinutes, setEstimatedMinutes] = useState('25');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const today = toDateKey(new Date());
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setSelection({
      categoryId:
        task?.categoryId ??
        activeCategories(useMobileAppStore.getState().categories)[0]?.id ??
        '',
      subCategoryId: task?.subCategoryId ?? '',
    });
    setEstimatedMinutes(String(task?.estimatedMinutes ?? 25));
    setScheduledDate(
      task?.scheduledDate ?? (task !== undefined ? taskScheduledDateKey(task) : undefined) ?? initialDate ?? today,
    );
    setStartTime(task?.startTime ?? '');
    setEndTime(task?.endTime ?? '');
    setError(null);
  }, [open, task, initialDate]);

  const stopwatch = task?.timerMode === 'stopwatch';

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle === '') {
      setError('クエスト名を入力してください。');
      return;
    }

    let schedule: {
      scheduledDate: string | undefined;
      startTime: string | undefined;
      endTime: string | undefined;
      scheduledAt: string | undefined;
    } = {
      scheduledDate: undefined,
      startTime: undefined,
      endTime: undefined,
      scheduledAt: undefined,
    };
    let minutes = 0;

    if (!stopwatch) {
      minutes = Number(estimatedMinutes);
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 480) {
        setError('予定時間は1〜480分の範囲で入力してください。');
        return;
      }
      const dateKey = scheduledDate.trim();
      if (dateKey !== '' && !isValidDateKey(dateKey)) {
        setError('日付は YYYY-MM-DD 形式で入力してください。');
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
      if (start !== '' && dateKey === '') {
        setError('時刻を設定する場合は日付も入力してください。');
        return;
      }
      schedule = {
        scheduledDate: dateKey === '' ? undefined : dateKey,
        startTime: start === '' ? undefined : start,
        endTime: end === '' ? undefined : end,
        scheduledAt:
          dateKey !== '' && start !== '' ? combineDateAndTime(dateKey, start) : undefined,
      };
    }

    const common = {
      title: trimmedTitle,
      description: description.trim(),
      category: '',
      categoryId: selection.categoryId === '' ? undefined : selection.categoryId,
      subCategoryId: selection.subCategoryId === '' ? undefined : selection.subCategoryId,
      estimatedMinutes: stopwatch ? 0 : Math.floor(minutes),
      ...(stopwatch ? { timerMode: 'stopwatch' as const } : {}),
      ...schedule,
    };

    if (task !== undefined) {
      updateTask(task.id, common);
    } else {
      createTask(common);
    }
    onClose();
  };

  const handleDelete = () => {
    if (task === undefined) return;
    Alert.alert('予定を削除', `「${task.title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          deleteTask(task.id);
          onClose();
        },
      },
    ]);
  };

  const today = toDateKey(new Date());
  const dateChoices = [
    { value: today, label: '今日' },
    { value: addDaysToKey(today, 1), label: '明日' },
    { value: addDaysToKey(today, 2), label: '2日後' },
    { value: addDaysToKey(today, 7), label: '1週間後' },
  ];

  return (
    <ModalSheet
      visible={open}
      title={task === undefined ? '新しいクエスト' : 'クエストを編集'}
      subtitle={
        stopwatch
          ? 'ストップウォッチで記録したクエストの内容を編集します'
          : '現実で取り組む内容を予定として登録します'
      }
      onClose={onClose}
    >
      <FormField label="クエスト名（必須）">
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

      {stopwatch ? (
        <Text style={styles.stopwatchNote}>
          ストップウォッチのクエストには予定時間・予定日がありません。
        </Text>
      ) : (
        <>
          <FormField label="予定時間（分）">
            <GameTextInput
              value={estimatedMinutes}
              onChangeText={setEstimatedMinutes}
              keyboardType="number-pad"
              placeholder="25"
              maxLength={3}
            />
          </FormField>

          <FormField label="予定日" hint="YYYY-MM-DD。未入力なら日付なしで登録します。">
            <GameTextInput
              value={scheduledDate}
              onChangeText={setScheduledDate}
              placeholder="2026-11-01"
              autoCapitalize="none"
            />
            <View style={styles.dateButtons}>
              {dateChoices.map((choice) => (
                <GameButton
                  key={choice.value}
                  label={choice.label}
                  size="sm"
                  variant={scheduledDate === choice.value ? 'primary' : 'ghost'}
                  onPress={() => setScheduledDate(choice.value)}
                />
              ))}
            </View>
          </FormField>

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <FormField label="開始時刻">
                <GameTextInput
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="19:00"
                  keyboardType="numbers-and-punctuation"
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
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </FormField>
            </View>
          </View>
        </>
      )}

      {error !== null && <Text style={styles.error}>{error}</Text>}

      <GameButton
        label={task === undefined ? 'クエストを追加' : '変更を保存'}
        onPress={handleSave}
        size="lg"
      />
      {task !== undefined && (
        <GameButton label="この予定を削除" onPress={handleDelete} variant="danger" />
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  dateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeField: {
    flex: 1,
  },
  stopwatchNote: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '700',
    lineHeight: 20,
  },
});
