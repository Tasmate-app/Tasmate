import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { RecurrenceRule, Task } from '@tasmate/types';
import { RecurrenceEditorModal } from '../features/sortie/RecurrenceEditorModal';
import { TaskEditorModal } from '../features/sortie/TaskEditorModal';
import { WeeklyPlannerSection } from '../features/sortie/WeeklyPlannerSection';
import { ScreenBackground, ScreenHeader } from '../ui';
import { spacing } from '../theme/tokens';

interface EditorState {
  task?: Task;
  date?: string;
}

export function PlanScreen() {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [ruleEditor, setRuleEditor] = useState<{ rule?: RecurrenceRule } | null>(null);

  return (
    <>
      <ScreenBackground>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            eyebrow="PLAN / WEEKLY SCHEDULE"
            title="計画"
            subtitle="1週間の予定・継続状況・繰り返し予定をまとめて確認できます。"
          />
          <WeeklyPlannerSection
            onEditTask={(task) => setEditor({ task })}
            onCreateTask={(date) => setEditor({ date })}
            onCreateRule={() => setRuleEditor({})}
            onEditRule={(rule) => setRuleEditor({ rule })}
          />
        </ScrollView>
      </ScreenBackground>

      <TaskEditorModal
        open={editor !== null}
        task={editor?.task}
        initialDate={editor?.date}
        onClose={() => setEditor(null)}
      />
      <RecurrenceEditorModal
        open={ruleEditor !== null}
        rule={ruleEditor?.rule}
        onClose={() => setRuleEditor(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
