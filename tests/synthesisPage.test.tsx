// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SynthesisPage } from '../src/features/synthesis/SynthesisPage';
import { initialAppState } from '../src/services/appState';
import { useAppStore } from '../src/stores/appStore';

function resetStore(): void {
  window.localStorage.clear();
  useAppStore.setState({ ...initialAppState() });
}

beforeEach(resetStore);
afterEach(cleanup);

describe('合成画面', () => {
  it('結晶タイプを切り替えてレシピを表示する', () => {
    render(<SynthesisPage />);

    expect(screen.getByRole('heading', { name: '合成' })).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '知識の結晶【N】を合成' }),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: '創造の結晶' }));

    expect(
      screen.getByRole('button', { name: '創造の結晶【N】を合成' }),
    ).not.toBeNull();
    expect(screen.getAllByText('太陽のかけら').length).toBeGreaterThan(0);
  });

  it('合成するとかけらと硬貨を消費して結晶を追加する', () => {
    useAppStore.setState({
      ...initialAppState(),
      itemInventory: { coin: 100, shard_moon: 5 },
    });

    render(<SynthesisPage />);
    fireEvent.click(screen.getByRole('button', { name: '知識の結晶【N】を合成' }));

    expect(screen.getByRole('status').textContent).toContain(
      '知識の結晶【N】を合成しました。',
    );
    expect(useAppStore.getState().itemInventory).toEqual({ knowledge_crystal_N: 1 });
  });

  it('素材が足りないレシピは合成できない', () => {
    useAppStore.setState({
      ...initialAppState(),
      itemInventory: { coin: 99, shard_moon: 5 },
    });

    render(<SynthesisPage />);
    const button = screen.getByRole('button', { name: '知識の結晶【N】を合成' });

    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
