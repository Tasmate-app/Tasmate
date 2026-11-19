import { expect, test } from '@playwright/test';
import { seedCompletedTutorial } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedCompletedTutorial(page);
});

test('ホームに今週の進捗とクエストボードが並ぶ', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ホーム', level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: '今週の進捗' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'クエスト選択' })).toBeVisible();
});

test('ホームは狭い画面で横スクロールしない', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('広い画面ではサイドバーがHUDを含む全高を占める', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const sidebar = await page.locator('.game-sidebar').boundingBox();
  const hud = await page.locator('.game-hud-bar').boundingBox();
  expect(sidebar).not.toBeNull();
  expect(hud).not.toBeNull();
  if (sidebar === null || hud === null) return;
  expect(sidebar.height).toBeGreaterThan(720);
  expect(sidebar.x + sidebar.width).toBeLessThanOrEqual(hud.x + 1);
});
