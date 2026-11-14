import { expect, test } from '@playwright/test';
import { seedCompletedTutorial } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedCompletedTutorial(page);
});

test('HUD から設定画面を開き、バックアップとアプリ情報を表示できる', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('設定を開く').click();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'データ管理' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'アプリ情報' })).toBeVisible();
  await expect(page.getByLabel('OSSライセンスの一覧を開く')).toBeVisible();
});

test('設定からOSSライセンス一覧を開き、全文を展開できる', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('OSSライセンスの一覧を開く').click();

  await expect(page).toHaveURL(/\/settings\/licenses$/);
  await expect(page.getByRole('heading', { name: 'OSSライセンス' })).toBeVisible();

  const firstItem = page.locator('.license-item').first();
  await expect(firstItem).toBeVisible();
  await firstItem.getByText('ライセンス全文を表示').click();
  await expect(firstItem.locator('pre')).toBeVisible();
});

test('バックアップを書き出すと最終バックアップが記録される', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'バックアップを書き出す' }).click();

  await expect(page.getByText(/バックアップを書き出しました/)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('tasmate:state:v1');
        if (raw === null) return null;
        return (JSON.parse(raw) as { settings?: { lastBackupAt?: string | null } }).settings
          ?.lastBackupAt ?? null;
      }),
    )
    .not.toBeNull();
});

test('確認入力なしではリセットできず、正しい入力でリセットできる', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'リセット', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'すべてのデータをリセット' });
  await expect(dialog).toBeVisible();
  const confirm = dialog.getByRole('button', { name: 'リセットする' });
  await expect(confirm).toBeDisabled();

  await dialog.getByLabel('確認入力').fill('リセット');
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(page.getByText('すべてのデータをリセットしました。')).toBeVisible();
});
