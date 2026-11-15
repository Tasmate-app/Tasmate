---
name: data-security
description: ローカル保存、バックアップ、データ移行、プライバシー、および将来のSupabase・PostgreSQL・認証・Row Level Securityを扱うときに使用する。
---

# Data and Security

## 基本方針
- 現在はローカル保存を前提としたプロトタイプで、Supabaseは未接続。導入時期は `docs/05_roadmap_and_open_questions.md` を確認する。
- UIコンポーネントから保存先やデータベースの詳細に直接依存させない。
- データの取得・保存はストアのアクションとサービス層を経由させる。
- ローカル保存からSupabaseへ移行する際に画面全体を書き換えずに済む構造を目指す。
- 将来の複数ユーザー対応を考慮し、ユーザー所有データを明確にする。

## 現在の保存構成
- `packages/core/src/storage.ts` の `StorageAdapter` を境界にする。
- Webは `src/services/storage.ts` から `localStorage`（キー `tasmate:state:v1`）を使う。旧キー `study-quest:state:v1` からの移行を壊さない。
- Nativeは `apps/mobile/src/stores/appStore.ts` で `createAsyncStorageAdapter(AsyncStorage)` を使う。
- 保存はデバウンスされる。クラッシュや終了時に失われる可能性を前提に、状態の復元処理を確認する。
- 読み込み時は `parseStoredAppState` でJSONと形式を検証し、`normalizeAppState` で不足フィールドを補完する。壊れたデータを黙って初期化せず、利用者へエラーを表示する。
- 永続データと一時的な画面状態を区別し、同じデータを重複管理しない。

## バックアップと復元
- バックアップ形式と上限は `packages/core/src/backup.ts` を正とする。上限は5MB（`MAX_BACKUP_FILE_BYTES`）。
- Webはダウンロードとファイル選択、Nativeは `expo-file-system` と `expo-sharing` を使う。
- 復元時は形式・サイズ・必須フィールドを検証し、失敗時は現在の状態を上書きしない。
- バックアップの仕様変更は `docs/04_data_design.md` と `docs/privacy-policy.md` に反映する。

## セキュリティとプライバシー
- サービスロールキー、APIキー、パスワードなどの秘密情報をソースコードへ記述しない。
- ブラウザ・アプリに公開してよい環境変数と、サーバー側だけで使う秘密情報を区別する。
- `.env` などの秘密情報をGitへコミットしない。`.env.example` には値ではなく必要な変数名と説明を記載する。
- `.env.example` と実際に参照する環境変数の整合を確認する。
- ユーザーの作業記録や個人情報を外部サービスへ送る場合、送信内容を最小限にする。
- プライバシーポリシーの本文は `packages/core/src/legal/privacyPolicy.ts` と `docs/privacy-policy.md` を正とし、保存先・外部送信の変更時に両方を更新する。
- エラーログに保存データ全文や個人情報を出さない。

## 将来のSupabase導入
- データベース変更はマイグレーションで管理する。
- ユーザー所有データには必要に応じて `user_id` を持たせる。
- 認証だけでなく、テーブル単位のRLSとポリシーをテストする。
- 既存データを破壊する操作は、明示的な必要性を確認する。
- 外部入力、APIレスポンス、保存データは必要に応じて実行時検証する。

## テスト
- `tests/appState.test.ts`、`tests/backup.test.ts`、`tests/privacyPolicy.test.ts`
- `tests/settingsStore.test.ts`、`tests/undoDeletion.test.ts`
- 保存形式・移行・破損データ・サイズ上限・復元失敗を確認する。
