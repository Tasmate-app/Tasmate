// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CalendarTaskModal } from '../src/features/calendar/CalendarTaskModal';
import { initialAppState } from '../src/services/appState';
import { useAppStore } from '../src/stores/appStore';

function resetStore(): void {
  window.localStorage.clear();
  useAppStore.setState({ ...initialAppState() });
}

beforeEach(resetStore);
afterEach(cleanup);

describe('CalendarTaskModal のストップウォッチ予定', () => {
  it('予定日時を持つストップウォッチ予定を作成する', () => {
    render(
      <CalendarTaskModal open initialDate="2026-11-20" onClose={() => undefined} />,
    );

    fireEvent.change(screen.getByLabelText('予定名（必須）'), {
      target: { value: '英語の復習' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ストップウォッチ' }));
    expect(screen.queryByLabelText('予定時間（分）')).toBeNull();
    expect(screen.queryByLabelText('毎週くり返す')).toBeNull();

    fireEvent.click(screen.getByLabelText('開始・終了時刻を指定する'));
    fireEvent.change(screen.getByLabelText('開始時刻'), { target: { value: '18:00' } });
    fireEvent.change(screen.getByLabelText('終了時刻'), { target: { value: '19:00' } });
    fireEvent.click(screen.getByRole('button', { name: '予定を追加' }));

    expect(useAppStore.getState().tasks[0]).toMatchObject({
      title: '英語の復習',
      timerMode: 'stopwatch',
      estimatedMinutes: 0,
      scheduledDate: '2026-11-20',
      startTime: '18:00',
      endTime: '19:00',
    });
  });
});
