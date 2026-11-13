import { expect, test } from '@playwright/test';

test('設定画面からプライバシーポリシーを開ける', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'プライバシーポリシーを確認' }).click();

  await expect(page).toHaveURL(/\/privacy$/);
  await expect(
    page.getByRole('heading', { name: 'Tasmate プライバシーポリシー' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: '1. 取得する情報' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '9. お問い合わせ' })).toBeVisible();
});

test('プライバシーポリシーから設定画面に戻れる', async ({ page }) => {
  await page.goto('/privacy');

  await expect(
    page.getByRole('heading', { name: 'Tasmate プライバシーポリシー' }),
  ).toBeVisible();
  await page.getByRole('link', { name: '設定に戻る' }).click();

  await expect(page).toHaveURL(/\/settings$/);
});
