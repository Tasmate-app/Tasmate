// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QuestCreateModal } from '../src/features/sortie/QuestCreateModal';
import { initialAppState } from '../src/services/appState';
import { useAppStore } from '../src/stores/appStore';

function resetStore(): void {
  window.localStorage.clear();
  useAppStore.setState({ ...initialAppState() });
}

beforeEach(resetStore);
afterEach(cleanup);

describe('QuestCreateModal の計測方式', () => {
  it('ストップウォッチを選ぶと予定時間の入力を隠す', () => {
    render(<QuestCreateModal open onClose={() => undefined} />);

    expect(screen.queryByLabelText('予定時間（分）')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'ストップウォッチ' }));

    expect(screen.queryByLabelText('予定時間（分）')).toBeNull();
    expect(screen.getByText('予定時間なしで登録します。終了時の実作業時間を記録します。')).not.toBeNull();
  });

  it('ストップウォッチ形式の予定を作成する', () => {
    render(<QuestCreateModal open onClose={() => undefined} />);

    fireEvent.change(screen.getByLabelText('クエスト名（必須）'), {
      target: { value: '英語の復習' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ストップウォッチ' }));
    fireEvent.click(screen.getByRole('button', { name: 'クエストを追加' }));

    expect(useAppStore.getState().tasks[0]).toMatchObject({
      title: '英語の復習',
      timerMode: 'stopwatch',
      estimatedMinutes: 0,
    });
  });
});
