import { expect, test } from '@playwright/test';

/**
 * スモークテスト：ゲーム一体型UIの基本画面が表示できること。
 * タイマーの長時間待機は行わず、画面遷移と主要要素の存在を確認する。
 */
test('ゲーム内ナビゲーションから全メニューへ遷移できる', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('3Dシェアハウス')).toBeVisible();
  for (const name of ['出撃', '仲間', '施設', 'ショップ', '倉庫'] as const) {
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${name === '出撃' ? 'sortie' : name === '仲間' ? 'companions' : name === '施設' ? 'facilities' : name === 'ショップ' ? 'shop' : 'storage'}`));
  }
});

test('出撃画面でクエスト選択と出撃準備が表示される', async ({ page }) => {
  await page.goto('/sortie');
  await expect(page.getByRole('heading', { name: 'クエスト選択' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '出撃準備' })).toBeVisible();
  await expect(page.getByRole('button', { name: '新しいクエストを作成' })).toBeVisible();
});

test('クエストを作成できる', async ({ page }) => {
  await page.goto('/sortie');
  await page.getByRole('button', { name: '新しいクエストを作成' }).click();
  await page.getByLabel('クエスト名（必須）').fill('E2Eテストクエスト');
  await page.getByRole('button', { name: 'クエストを追加' }).click();
  await expect(page.getByText('E2Eテストクエスト', { exact: true }).first()).toBeVisible();
});

test('仲間一覧から詳細を開いて戻れる', async ({ page }) => {
  await page.goto('/companions');
  await expect(page.getByRole('heading', { name: '仲間' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'キャラクター選択' })).toBeVisible();
  await page.getByRole('button', { name: /ルナ/ }).click();
  await expect(page.getByRole('region', { name: 'ルナの表示' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'ルナのステータス' })).toBeVisible();
  await expect(page.getByRole('button', { name: /レベルアップ/ })).toBeDisabled();
  await expect(page.getByText('経験値が足りません')).toBeVisible();
  await page.getByRole('button', { name: '← 仲間一覧に戻る' }).click();
  await expect(page.getByRole('group', { name: 'キャラクター選択' })).toBeVisible();
  // 狭い画面でもページ全体に横スクロールが発生しないこと
  await page.setViewportSize({ width: 375, height: 800 });
  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(noOverflow).toBe(true);
});

test('施設一覧から詳細を開いて戻れる', async ({ page }) => {
  await page.goto('/facilities');
  await expect(page.getByRole('heading', { name: '施設' })).toBeVisible();
  await page.getByRole('button', { name: /コイン工房/ }).click();
  await expect(page.getByRole('button', { name: '← 施設一覧に戻る' })).toBeVisible();
  await expect(page.getByRole('button', { name: /強化する/ })).toBeVisible();
  await page.getByRole('button', { name: '← 施設一覧に戻る' }).click();
  await expect(page.getByRole('heading', { name: '施設' })).toBeVisible();
});

test('ショップと倉庫が表示される', async ({ page }) => {
  await page.goto('/shop');
  await expect(page.getByRole('heading', { name: 'ショップ' })).toBeVisible();
  await expect(page.getByRole('button', { name: /強化/ }).first()).toBeVisible();
  await page.goto('/storage');
  await expect(page.getByRole('heading', { name: '倉庫' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '報酬履歴' })).toBeVisible();
});
