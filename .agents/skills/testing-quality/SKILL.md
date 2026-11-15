---
name: testing-quality
description: 型チェック、静的解析、Vitest、Playwright、本番ビルド、Expoの検証、回帰確認など品質確認を行うときに使用する。
---

# Testing and Quality

## 基本方針
- 実行前に `package.json`、`apps/mobile/package.json`、既存スクリプトを確認する。
- プロジェクトで利用可能なコマンドを優先し、存在しないスクリプトを仮定しない。
- 変更範囲に応じて適切な検証を実施する。
- 実行していないテストを成功したと報告しない。

## Web・共有パッケージ
- `npm run typecheck`：TypeScript型チェック
- `npm run lint`：ESLint
- `npm run test`：Vitest単体テスト
- `npm run e2e`：Playwright E2E（WebのChromiumのみ）
- `npm run build`：型チェック + 本番ビルド
- `npm run licenses:generate`：依存関係を変更したとき

対象範囲：
- ESLintとVitestの対象は `src/`、`tests/`、`packages/`。`apps/mobile/` は含まれない。
- Vitestは `tests/**/*.test.ts(x)`、`src/**/*.test.ts(x)`、`packages/**/*.test.ts` を実行する。
- PlaywrightはWebのみを対象とし、Nativeアプリは検証しない。

## Native
- `npm run typecheck -w tasmate-mobile`：Native型チェック
- `npm run doctor -w tasmate-mobile`：Expo設定・依存関係の確認
- `npm run export:android -w tasmate-mobile` / `npm run export:ios -w tasmate-mobile`：書き出し確認
- `npm run apk:release -w tasmate-mobile`：WindowsでのAPKビルド（手順はREADME参照）
- Nativeには現時点で単体テストの実行環境がない。型チェック・Expo Doctor・Expo Goまたは実機で確認する。
- ネイティブ設定を変更した場合は `apps/mobile/android/` が再生成される影響を理解してから `prebuild` を実行する。

## 重点テスト
- タイマーの開始・一時停止・再開・終了・中断
- リロード後、バックグラウンド復帰後、アプリ再起動後の作業状態の復元
- 報酬計算、ドロップ抽選、素材収集、施設生産、結晶合成
- レベルアップ、昇華、通貨・アイテム消費
- 週間達成、継続倍率、繰り返し予定、休息の冪等性
- 不正な数値や欠損データへの対応
- 二重報酬の防止
- 保存・バックアップ・復元・破損データ
- 3Dシーンの初期化、カメラ計算、モデル読み込み失敗時の動作
- ユーザー別データのアクセス制御（Supabase導入後）

## 失敗時
- テスト失敗の原因を調査して修正する。
- 変更と無関係な既存失敗がある場合は、その事実を区別して報告する。
- 実行したコマンドと結果を正確に記録する。
- 実行できなかった検証は、理由と代替確認を報告する。
