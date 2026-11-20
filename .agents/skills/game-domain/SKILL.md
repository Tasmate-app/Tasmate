---
name: game-domain
description: ゲーム経済、報酬計算、素材・結晶ドロップ、育成、施設生産、探索、週次倍率などのゲームルールを設計・実装するときに使用する。
---

# Game Domain Logic

## 基本方針
- ゲームルールをReactコンポーネントや3D描画に直接埋め込まない。
- Web・Native共通のルールは `packages/core/src/` に置く。Webの `src/domain/` は `@tasmate/core` の再エクスポート、Nativeは `@tasmate/core` を直接参照する。
- 共有ロジックはDOM・React Native・`localStorage`・`AsyncStorage` に依存させない。
- 3D画面を起動しなくてもゲームロジックをテストできる構造にする。
- 報酬の「決定」と「付与」を分離する。

## 主なモジュール
- `packages/core/src/constants.ts`：`BALANCE`、`WEEKLY_RULES` などの基準値
- `packages/core/src/reward.ts`：報酬候補の生成と確定
- `packages/core/src/rewardService.ts`：セッション報酬の組み立て
- `packages/core/src/rewards/`：抽選、ドロップ率、報酬設定、付与処理
- `packages/core/src/progression/`：レベルアップ、昇華、進行設定
- `packages/core/src/inventory/`：アイテム定義、所持数、素材保管、結晶合成
- `packages/core/src/facility.ts` / `collection.ts` / `rest.ts` / `weekly.ts`
- `packages/core/src/seed.ts`：キャラクター・探索先・施設のマスターデータ
- `packages/types/`：共有型。UI固有の型を混ぜない

## 対象機能
- 作業実績に応じた報酬計算
- 素材・通貨・経験値・結晶の管理と抽選
- キャラクターのレベルアップ、昇華、能力補正
- 探索・派遣・素材収集
- 施設による素材・通貨の生産
- 家具・施設・コスチュームの購入や強化
- 週間達成度・継続倍率・休息の判定

## 実装ルール
- 計算の入力と出力を明確にし、単体テストを用意する。
- 数値の上限・下限・負数・欠損・不正な入力を検証する。
- 乱数を使う処理は `random` などの注入手段を用意し、テストを決定的にする。
- キャラクター属性、探索先、施設レベルなどの補正条件を明示する。
- バランス値は `constants.ts`、`rewards/rewardConfig.ts`、`progression/progressionConfig.ts`、`inventory/itemDefinitions.ts` などに集約し、画面へ直値を散らさない。
- バランス値を変更する場合は `docs/02_game_design.md`、`docs/04_data_design.md`、`docs/06_weekly_calendar_and_streak.md` と関連テストへの影響を確認する。
- 同じ報酬・ドロップが二重付与されないよう、冪等性を意識する。
- オンライン化後、重要な報酬付与はサーバー側で検証・確定する。
- キーワード判定の結果をそのまま信用せず、形式・範囲・重複付与を検証する。
- タスク評価に失敗しても、基本的なタスク管理とゲーム進行を停止させない。

## テスト
- `tests/reward.test.ts`、`tests/taskRewards.test.ts`
- `tests/facility.test.ts`、`tests/characterLevelUp.test.ts`
- `tests/crystalSynthesis.test.ts`、`tests/inventoryProgression.test.ts`
- `tests/weekly.test.ts`、`tests/weeklyStore.test.ts`
- 変更したルールに対応するテストを追加・更新する。
