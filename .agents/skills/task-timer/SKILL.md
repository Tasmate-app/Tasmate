---
name: task-timer
description: タスク管理、勉強計画、作業タイマー、作業履歴、中断・再開、完了判定、週間カレンダーを実装・変更するときに使用する。
---

# Task and Timer

## 基本方針
- ゲーム要素は現実の作業継続を支援するためのものであり、タスク管理やタイマーの使いやすさを損なわない。
- タスクの登録・編集・開始・終了を少ない操作で行えるようにする。
- タイマーの状態遷移と永続化のタイミングを明確にする。
- 共有ロジックは `packages/core/src/` に置き、Web・Nativeで挙動を揃える。

## 経過時間と復元
- 経過時間を一定間隔のカウントアップ処理だけに依存させない。
- 作業開始時刻を基準に経過時間を算出する（`session.ts` の `elapsedSeconds` など）。
- Webではページ再読み込みやタブのバックグラウンド化、Nativeではアプリのバックグラウンド移行・復帰・強制終了に対応する。
- Nativeは `AppState` の変化を監視し、復帰時に現在時刻から経過時間・休息・週次判定を再計算する（`apps/mobile/src/components/GameRuntime.tsx`）。
- タイマー表示の更新間隔はUIの都合であり、正規の経過時間は開始時刻から求める。
- 一時停止・再開・終了・中断の状態遷移を明確に定義する。
- 日付・タイムゾーンは保存形式と表示形式を区別する。週の開始は `weekly.ts` の規則に従う。

## 履歴と報酬
- 作業履歴には開始時刻、終了時刻、経過時間、タスク識別子、中断理由など必要な情報を保存する。
- 重複した完了処理で報酬が二重付与されないようにする。
- ローカル時刻やブラウザ・端末の状態だけを信頼して、将来のオンライン環境で報酬を確定しない。
- 報酬計算そのものは `game-domain` Skillの方針に従い、UIやタイマー処理から分離する。
- 完了時の付与は `packages/core/src/rewards/rewardProcessor.ts` を経由し、`itemInventory` と旧 `inventory` の整合を保つ。

## 週間カレンダー・繰り返し・休息
- 繰り返し予定は `recurrence.ts`、週間達成と継続倍率は `weekly.ts`、休息は `rest.ts` を使う。
- 週次判定は `weekStart` 単位で冪等にし、過去週を古い順に処理する。
- 仕様は `docs/06_weekly_calendar_and_streak.md` を正とする。
- 画面・HUDへの表示変更は `README.md` の「画面」も確認する。

## テスト対象
- 開始・一時停止・再開・終了・中断
- リロード後、バックグラウンド復帰後、アプリ再起動後の作業状態の復元
- 日付境界・タイムゾーン・週の開始
- 週次判定の冪等性と繰り返し予定の生成
- 完了処理の重複と二重報酬の防止

## 主なテスト
- `tests/session.test.ts`、`tests/sessionStore.test.ts`、`tests/interruptStore.test.ts`
- `tests/stopwatch.test.ts`、`tests/rest.test.ts`、`tests/restStore.test.ts`
- `tests/weekly.test.ts`、`tests/weeklyStore.test.ts`
- Nativeには現時点で単体テスト環境がないため、型チェックと実機・Expo Goで復帰挙動を確認する。
