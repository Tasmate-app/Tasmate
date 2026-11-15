---
name: ai-integration
description: AI報酬、タスク解析インターフェース、AI出力の検証、外部AIサービスとの連携、障害時のフォールバックを実装するときに使用する。
---

# AI Integration

## 現在の構成
- タスク解析の境界は `packages/ai-rewards/src/interfaces.ts` の `TaskAnalyzer`。
- 出力の語彙と実行時検証は `packages/ai-rewards/src/schemas.ts` の `parseTaskAnalysis`、`isCrystalType`、`isTaskDifficulty`。
- プロンプトは `packages/ai-rewards/src/prompts.ts`。
- キーワードによる代替判定は `packages/ai-rewards/src/fallback.ts` の `analyzeTaskFallback`。
- 現在の報酬計算は `packages/core/src/rewards/rewardCalculator.ts` がフォールバック解析を利用している。外部AIサービスは未接続。
- 結晶は5種、難易度は1〜5の範囲で扱う。語彙は `@tasmate/types` とスキーマに従う。

## 基本方針
- AI呼び出しは専用のサービス層またはサーバー側関数を経由させる。UIや `packages/core` からプロバイダーSDKを直接呼ばない。
- APIキーをフロントエンドやモバイルアプリに埋め込まない。
- AIの応答形式を検証してからゲームロジックへ渡す。
- AIの自由文だけを報酬確定の根拠にしない。
- 報酬候補の生成と、許可された報酬の確定を分離する。確定処理は `game-domain` の方針に従う。

## Analyzer追加時のルール
- 新しい `TaskAnalyzer` は `packages/ai-rewards/` またはサーバー側に実装し、`@tasmate/ai-rewards` の境界から利用する。
- 入力は `TaskAnalysisInput`、出力は `AIRewardEvaluation` に合わせる。
- 受信した出力は必ず `parseTaskAnalysis` で検証し、未知の種類・範囲外の難易度・不正な信頼度を棄却する。
- タイムアウト、通信失敗、形式不正、空応答、レート制限を考慮し、失敗時は `analyzeTaskFallback` へ切り替える。
- 信頼度は0〜1に丸め、理由文は長さを制限する。
- 同じセッション・タスクで報酬やドロップを二重付与しない。
- 決定性が必要なテストでは、Analyzerや乱数生成を注入できる構造にする。

## プライバシー
- タスクの説明には個人情報が含まれうる。外部AIへ送る内容を最小限にし、送信項目を `docs/privacy-policy.md` と `docs/04_data_design.md` に反映する。
- 秘密情報や不要な個人情報をログへ出力しない。
- 環境変数を使う場合は `.env.example` に変数名と説明だけを記載する。

## テスト
- `parseTaskAnalysis` の正常系・不正形式・範囲外・欠損。
- `analyzeTaskFallback` のキーワード判定とカテゴリ既定値。
- `rewardCalculator` の抽選・難易度・ドロップ・二重付与防止。
- 実際のAPI呼び出しを行うテストと、モック・フォールバックを使うテストを区別する。
