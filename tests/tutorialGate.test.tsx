// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TUTORIAL_STEPS } from '@tasmate/core';
import { TutorialGate } from '../src/features/tutorial/TutorialGate';
import { initialAppState } from '../src/services/appState';
import { useAppStore } from '../src/stores/appStore';

function resetStore(): void {
  window.localStorage.clear();
  useAppStore.setState({ ...initialAppState(), lastDeletion: null });
}

beforeEach(resetStore);
afterEach(cleanup);

describe('初回チュートリアル', () => {
  it('未完了なら初回ステップを表示する', () => {
    render(<TutorialGate />);

    expect(
      screen.getByRole('dialog', { name: TUTORIAL_STEPS[0].title }),
    ).not.toBeNull();
    expect(screen.getByText(TUTORIAL_STEPS[0].body)).not.toBeNull();
  });

  it('次へと戻るでステップを移動できる', () => {
    render(<TutorialGate />);

    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    expect(
      screen.getByRole('dialog', { name: TUTORIAL_STEPS[1].title }),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '戻る' }));
    expect(
      screen.getByRole('dialog', { name: TUTORIAL_STEPS[0].title }),
    ).not.toBeNull();
  });

  it('最後まで進めると完了日時を記録して閉じる', () => {
    render(<TutorialGate />);

    for (let index = 1; index < TUTORIAL_STEPS.length; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'はじめる' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    const completedAt = useAppStore.getState().settings.tutorialCompletedAt;
    expect(completedAt).not.toBeNull();
    expect(Number.isNaN(Date.parse(completedAt ?? ''))).toBe(false);
  });

  it('スキップでも完了日時を記録する', () => {
    render(<TutorialGate />);

    fireEvent.click(screen.getByRole('button', { name: 'スキップ' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useAppStore.getState().settings.tutorialCompletedAt).not.toBeNull();
  });

  it('完了済みなら自動表示しない', () => {
    const state = initialAppState();
    useAppStore.setState({
      ...state,
      settings: {
        ...state.settings,
        tutorialCompletedAt: '2026-11-14T09:00:00.000Z',
      },
      lastDeletion: null,
    });

    render(<TutorialGate />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escapeキーでも閉じられる', () => {
    render(<TutorialGate />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useAppStore.getState().settings.tutorialCompletedAt).not.toBeNull();
  });
});
