import { expect, test } from '@playwright/test';
import { seedCompletedTutorial } from './helpers';

test('初回起動でチュートリアルを表示し、完了後は再表示しない', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('dialog', { name: 'Tasmateへようこそ' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      '現実の勉強やタスクへの取り組みが、キャラクターと拠点の成長につながるゲームです。',
    ),
  ).toBeVisible();

  for (const title of [
    'クエストを登録する',
    'タイマーで作業する',
    '報酬と育成',
    '計画と継続',
  ]) {
    await page.getByRole('button', { name: '次へ' }).click();
    await expect(page.getByRole('dialog', { name: title })).toBeVisible();
  }

  await page.getByRole('button', { name: 'はじめる' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('tasmate:state:v1');
        if (raw === null) return null;
        return (
          JSON.parse(raw) as { settings?: { tutorialCompletedAt?: string | null } }
        ).settings?.tutorialCompletedAt ?? null;
      }),
    )
    .not.toBeNull();

  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('設定画面からチュートリアルを再表示できる', async ({ page }) => {
  await seedCompletedTutorial(page);
  await page.goto('/settings');

  await page.getByRole('button', { name: 'チュートリアルを見る' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Tasmateへようこそ' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
