// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { UndoToast } from '../src/components/game/UndoToast';
import { initialAppState } from '../src/services/appState';
import { useAppStore } from '../src/stores/appStore';

function resetStore(): void {
  window.localStorage.clear();
  useAppStore.setState({ ...initialAppState(), lastDeletion: null });
}

beforeEach(resetStore);
afterEach(cleanup);

describe('UndoToast', () => {
  it('削除したクエストを「元に戻す」ボタンから復元できる', () => {
    const taskId = useAppStore.getState().createTask({
      title: '英語の復習',
      description: '',
      category: '',
      categoryId: 'cat-default-study',
      estimatedMinutes: 25,
    });
    useAppStore.getState().deleteTask(taskId);

    render(<UndoToast />);
    expect(screen.getByText('クエスト「英語の復習」を削除しました')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '元に戻す' }));

    expect(useAppStore.getState().tasks.find((task) => task.id === taskId)?.archivedAt).toBeUndefined();
    expect(screen.queryByText('クエスト「英語の復習」を削除しました')).toBeNull();
  });
});
