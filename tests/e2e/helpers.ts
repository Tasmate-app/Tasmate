import type { Page } from '@playwright/test';
import {
  STORAGE_KEY,
  initialAppState,
  toAppStateSnapshot,
} from '@tasmate/core';

const SEED_FLAG = 'tasmate:e2e:tutorial-seeded';

export async function seedCompletedTutorial(page: Page): Promise<void> {
  const state = toAppStateSnapshot(initialAppState());
  state.settings = {
    ...state.settings,
    tutorialCompletedAt: '2026-01-01T00:00:00.000Z',
  };

  await page.addInitScript(
    ({ key, flag, value }: { key: string; flag: string; value: string }) => {
      if (window.sessionStorage.getItem(flag) === '1') return;
      window.localStorage.setItem(key, value);
      window.sessionStorage.setItem(flag, '1');
    },
    { key: STORAGE_KEY, flag: SEED_FLAG, value: JSON.stringify(state) },
  );
}
