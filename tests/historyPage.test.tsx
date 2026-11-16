// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { WorkSession } from '@tasmate/types';
import { initialAppState } from '@tasmate/core';
import { HistoryPage } from '../src/features/history/HistoryPage';
import { useAppStore } from '../src/stores/appStore';

function makeSession({
  id,
  daysAgo,
  categoryId,
  categoryName,
  title,
  durationSeconds,
}: {
  id: string;
  daysAgo: number;
  categoryId: string;
  categoryName: string;
  title: string;
  durationSeconds: number;
}): WorkSession {
  const endedAt = new Date();
  endedAt.setHours(12, 0, 0, 0);
  endedAt.setDate(endedAt.getDate() - daysAgo);
  const startedAt = new Date(endedAt.getTime() - durationSeconds * 1000);
  return {
    id,
    taskId: `task-${id}`,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    accumulatedSeconds: 0,
    state: 'idle',
    result: 'completed',
    destinationId: 'd-hills',
    assignedCharacterIds: [],
    taskTitleSnapshot: title,
    categoryIdSnapshot: categoryId,
    categoryNameSnapshot: categoryName,
  };
}

function categoryBreakdown(): HTMLElement {
  const heading = screen.getByRole('heading', { name: /^カテゴリー別/ });
  const card = heading.closest('section');
  if (card === null) throw new Error('カテゴリー別カードが見つかりません');
  return within(card).getByRole('list');
}

beforeEach(() => {
  useAppStore.setState({
    ...initialAppState(),
    sessionHistory: [
      makeSession({
        id: 'inside',
        daysAgo: 0,
        categoryId: 'cat-default-study',
        categoryName: '勉強',
        title: '今日の作業',
        durationSeconds: 600,
      }),
      makeSession({
        id: 'outside-day',
        daysAgo: 20,
        categoryId: 'cat-default-work',
        categoryName: '作業',
        title: '20日前の作業',
        durationSeconds: 1200,
      }),
    ],
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HistoryPage のカテゴリー別期間', () => {
  it('日単位では表示期間外のカテゴリーを集計しない', () => {
    render(<HistoryPage />);

    const breakdown = categoryBreakdown();
    expect(within(breakdown).queryByText('勉強')).not.toBeNull();
    expect(within(breakdown).queryByText('作業')).toBeNull();
    expect(screen.getByText('20日前の作業')).not.toBeNull();
  });

  it('週単位に切り替えると期間内のカテゴリーが追加される', () => {
    render(<HistoryPage />);

    fireEvent.click(screen.getByRole('button', { name: '週' }));

    expect(screen.getByRole('heading', { name: 'カテゴリー別（直近8週）' })).not.toBeNull();
    const breakdown = categoryBreakdown();
    expect(within(breakdown).queryByText('勉強')).not.toBeNull();
    expect(within(breakdown).queryByText('作業')).not.toBeNull();
  });
});

describe('HistoryPage の作業セッション削除', () => {
  it('確認後に作業セッションを履歴から削除できる', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<HistoryPage />);

    fireEvent.click(
      screen.getByRole('button', { name: '今日の作業の作業セッションを削除' }),
    );

    expect(window.confirm).toHaveBeenCalled();
    expect(useAppStore.getState().sessionHistory.some((session) => session.id === 'inside')).toBe(
      false,
    );
    expect(useAppStore.getState().lastDeletion).toMatchObject({ kind: 'session' });
    expect(screen.queryByText('今日の作業')).toBeNull();
  });

  it('確認をキャンセルした場合は削除しない', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<HistoryPage />);

    fireEvent.click(
      screen.getByRole('button', { name: '今日の作業の作業セッションを削除' }),
    );

    expect(useAppStore.getState().sessionHistory.some((session) => session.id === 'inside')).toBe(
      true,
    );
    expect(screen.queryByText('今日の作業')).not.toBeNull();
  });
});
