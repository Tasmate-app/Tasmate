import { expect, test } from '@playwright/test';
import { seedCompletedTutorial } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedCompletedTutorial(page);
});

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

test('ストップウォッチ形式のクエストを作成できる', async ({ page }) => {
  await page.goto('/sortie');
  await page.getByRole('button', { name: '新しいクエストを作成' }).click();
  await page.getByLabel('クエスト名（必須）').fill('ストップウォッチ予定テスト');
  await page.getByRole('button', { name: 'ストップウォッチ', exact: true }).click();
  await expect(page.getByLabel('予定時間（分）')).toHaveCount(0);
  await page.getByRole('button', { name: 'クエストを追加' }).click();
  await expect(page.getByText('ストップウォッチ（予定時間なし）').first()).toBeVisible();
});

test('作成したクエストが再読み込み後も復元される', async ({ page }) => {
  await page.goto('/sortie');
  await page.getByRole('button', { name: '新しいクエストを作成' }).click();
  await page.getByLabel('クエスト名（必須）').fill('永続化テストクエスト');
  await page.getByRole('button', { name: 'クエストを追加' }).click();
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('tasmate:state:v1')))
    .toContain('永続化テストクエスト');

  await page.reload();
  await expect(page.getByText('永続化テストクエスト', { exact: true }).first()).toBeVisible();
});

test('作業完了後に休憩を提案し、設定した時間で休憩を開始できる', async ({ page }) => {
  await page.goto('/sortie');
  await page.getByRole('button', { name: '新しいクエストを作成' }).click();
  await page.getByLabel('クエスト名（必須）').fill('休憩テストクエスト');
  await page.getByRole('button', { name: 'クエストを追加' }).click();
  await page.getByRole('button', { name: '出撃（作業開始）' }).click();
  await expect(page.getByRole('heading', { name: '作業中' })).toBeVisible();
  await page.getByRole('button', { name: '完了' }).click();
  await expect(page.getByLabel('休憩の提案')).toBeVisible();
  await page.getByLabel('休憩時間（分）').fill('10');
  await page.getByRole('button', { name: '休憩をはじめる' }).click();
  await expect(page.getByLabel('休憩中')).toBeVisible();
});

test('仲間一覧から詳細を開いて戻れる', async ({ page }) => {
  await page.goto('/companions');
  await expect(page.getByRole('heading', { name: '仲間' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'キャラクター選択' })).toBeVisible();
  await page.getByRole('button', { name: /ルナ/ }).click();
  await expect(page.getByRole('region', { name: 'ルナの表示' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'ルナのステータス' })).toBeVisible();
  await expect(page.getByRole('button', { name: /レベルアップ/ })).toBeDisabled();
  await expect(page.getByText('素材が足りません。')).toBeVisible();
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

test('週間カレンダーで予定と繰り返しを作成できる', async ({ page }) => {
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: '週間カレンダー' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '直近の記録' })).toBeVisible();

  await page.getByRole('button', { name: '予定を追加', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '予定を追加' });
  await dialog.getByLabel('予定名（必須）').fill('カレンダーE2E予定');
  await dialog.getByRole('button', { name: '予定を追加' }).click();
  await expect(page.getByText('カレンダーE2E予定', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: '予定を追加', exact: true }).click();
  const repeatDialog = page.getByRole('dialog', { name: '予定を追加' });
  await repeatDialog.getByLabel('予定名（必須）').fill('毎朝の復習');
  await repeatDialog.getByLabel('毎週くり返す').check();
  await repeatDialog.getByRole('button', { name: '予定を追加' }).click();
  await expect(page.getByRole('heading', { name: '繰り返し予定' })).toBeVisible();
  await expect(page.getByText('毎朝の復習', { exact: true }).first()).toBeVisible();
  const recurrencePanel = page.getByRole('region', { name: '繰り返し予定' });
  const notClipped = await recurrencePanel.evaluate(
    (element) => element.scrollHeight <= element.clientHeight + 1,
  );
  expect(notClipped).toBe(true);
});

test('週間カレンダーは狭い画面で横スクロールしない', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: '週間カレンダー' })).toBeVisible();
  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(noOverflow).toBe(true);
});
