// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RecurrenceRuleModal } from '../src/features/calendar/RecurrenceRuleModal';
import { initialAppState } from '../src/services/appState';
import { useAppStore } from '../src/stores/appStore';

function resetStore(): void {
  window.localStorage.clear();
  useAppStore.setState({ ...initialAppState() });
}

beforeEach(resetStore);
afterEach(cleanup);

describe('RecurrenceRuleModal の曜日一括選択', () => {
  it('「すべて」で既存ルールを全曜日へ更新する', () => {
    const ruleId = useAppStore.getState().createRecurrenceRule({
      title: '毎日の復習',
      description: '',
      category: '',
      estimatedMinutes: 25,
      daysOfWeek: [1],
      effectiveFrom: '2026-11-16',
    });
    const rule = useAppStore
      .getState()
      .recurrenceRules.find((candidate) => candidate.id === ruleId);
    if (rule === undefined) throw new Error('テスト用の繰り返しルールを作成できません');

    render(<RecurrenceRuleModal rule={rule} onClose={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'すべて' }));
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    const updated = useAppStore
      .getState()
      .recurrenceRules.find((candidate) => candidate.id === ruleId);
    expect(updated?.daysOfWeek).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
