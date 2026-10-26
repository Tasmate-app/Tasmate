# BUG.md

## 調査概要

- 対象: Tasmate (`D:\vscode\Pages\Tasmate`)
- 調査日: 2026-10-24
- 方法: ソースコードの静的確認、既存テストの実行、一時的な再現テストによる動作確認
- コード修正: 未実施
- 再現用の一時テストは確認後に削除済み

## 検証コマンドの結果

| コマンド | 結果 |
| --- | --- |
| `npm run typecheck` | 成功 |
| `npm test` | 7ファイル / 51テスト 成功 |
| `npm run build` | 成功（チャンクサイズ警告あり） |
| `npm run lint` | 失敗（ESLint 9 用の設定ファイルが無い） |

補足:

- 既存テスト 51 件はすべて成功しているが、本レポートの不具合は検出していない。
- 重大度は「高 / 中 / 低」で表記する。

## 1. 重大な不具合

### BUG-01 完了済みタスクを再実行でき、報酬を繰り返し取得できる

- 重大度: 高
- 該当箇所:
  - `src/stores/appStore.ts:407` `startSession`
  - `src/features/tasks/TimerPanel.tsx:24,52,108`
- 再現手順:
  1. タスクを開始し、完了する。
  2. TimerPanel のタスク選択が完了タスクの ID を保持したままになる。
  3. キャラクターと出撃先を選び、再度「出撃」を押す。
- 実際の動作: 完了済みタスクが再び `active` になり、完了報酬を何度でも取得できる。
- 期待する動作: 完了済み・アーカイブ済みタスクは開始できない。選択が無効なら開始不可にするか、有効なタスクへフォールバックする。
- 原因:
  - `startSession` は `archivedAt` しか確認せず、`task.status` を検証していない。
  - `TimerPanel` は `plannedTasks` から消えた `taskId` をリセットしない。
  - `taskSelected` の判定が `taskId !== '' || plannedTasks.length === 0` であり、選択値が選択肢に存在するかを見ていない。
- 修正案:
  - `startSession` で `task.status === 'planned'` を必須にする。
  - `TimerPanel` で `taskId` を `plannedTasks` と同期し、完了後にクリアする。
  - 二重報酬防止をセッション単位だけでなくタスク単位でも検討する。
- 確認状況: `completed` タスクに対して `startSession` が成功することを再現確認済み。

### BUG-02 派遣キャラクターが素材収集報酬に反映されない

- 重大度: 高
- 該当箇所:
  - `src/services/rewardService.ts:47`
  - `src/domain/reward.ts:46-52`
  - `src/domain/collection.ts:41-50`
- 再現手順:
  1. キャラクターを複数所持した状態で、派遣キャラクターを 1 人だけ選ぶ。
  2. セッションを完了する。
- 実際の動作: 所持キャラクター全員で素材収集が計算される。
  - 確認値: 派遣 1 人相当 `{ shard_sun: 5, shard_star: 2 }` に対し、実際は `{ shard_sun: 12, shard_star: 5 }`。
- 期待する動作: `session.assignedCharacterIds` のキャラクターだけが収集効率に寄与する。
- 原因: `calculateCollection` は `assignedCharacterIds` を受け取れるが、`proposeReward` が常に `undefined` を渡している。`computeSessionReward` は `session` を持っているのに、その ID を渡していない。
- 修正案:
  - `WorkOutcomeInput` に `assignedCharacterIds` を追加する。
  - `computeSessionReward` から `session.assignedCharacterIds` を渡す。
  - 「派遣したキャラクターだけが素材計算に影響する」テストを追加する。
- 確認状況: 再現確認済み。

### BUG-03 中断時に施設生産素材へ報酬係数が二重適用される

- 重大度: 中〜高（ゲーム経済に影響）
- 該当箇所: `src/domain/reward.ts:59-70`
- 再現手順:
  1. 作業 25 分、キャラクターなし、素材生産施設（`shard_star` 0.4/分、Lv1）のみ有効にする。
  2. セッションを中断する。
- 実際の動作: 施設生産素材が `2` になる。
- 期待する動作: `floor(floor(25 * 0.4) * 0.5) = 5`。
- 原因:
  - 施設生産素材を `merged` に加算する時点で `factor` を掛けている。
  - その後の「中断時は収集分にも係数を適用する」ループで、`merged` 全体に再度 `factor` を掛けている。
  - 通貨は二重適用されていないため、素材だけが極端に少なくなる。
- 修正案: 生産素材の加算時は係数を掛けず、最後の一括適用のみにする。または第二ループから生産素材を除外する。
- 確認状況: 再現確認済み（中断時 `2`、期待 `5`）。

### BUG-04 繰り返し予定の日付を変更すると元の日の予定が再生成され重複する

- 重大度: 高
- 該当箇所:
  - `src/stores/appStore.ts:235-257` `updateTask`
  - `src/domain/recurrence.ts:33-44` `occurrenceExists`
  - `src/stores/appStore.ts:162-174` `generateOccurrencesForWeek`
- 再現手順:
  1. 月曜日の繰り返し予定を作成する。
  2. その予定の日付を火曜日へ変更する。
  3. カレンダーを再表示する、または `ensureRecurringOccurrencesForWeek` を実行する。
- 実際の動作: 火曜日の予定に加えて月曜日の予定が再生成される（確認: `2026-10-20` と `2026-10-19` の 2 件）。
- 期待する動作: 移動後の予定 1 件のみ。
- 原因:
  - `updateTask` は `scheduledDate` を変更するだけで `recurrenceId` を維持する。
  - `occurrenceExists` は「ルール ID + 予定日」で存在判定するため、元の日付の予定が無いと再生成される。
  - 移動を「その回だけの変更」として識別する情報が無い。
- 修正案:
  - 日付変更時は `recurrenceId` を外して単発予定化する。
  - または `originalOccurrenceDate`（ルール上の予定日）を保持し、存在判定をそれで行う。
  - または移動元の日付の tombstone を残す。
  - `docs/06_weekly_calendar_and_streak.md` の仕様と照合して方針を決める。
- 確認状況: 再現確認済み。

### BUG-05 繰り返しルールから曜日を削除→再追加しても予定が復活しない

- 重大度: 中〜高
- 該当箇所:
  - `src/stores/appStore.ts:177-203` `applyRuleToUpcomingOccurrences`
  - `src/domain/recurrence.ts:33-44` `occurrenceExists`
- 再現手順:
  1. 月曜・水曜の繰り返しルールを作成する。
  2. 水曜を削除する（水曜の予定がアーカイブされる）。
  3. 水曜を再追加する。
  4. カレンダーを再表示する。
- 実際の動作: 水曜の予定が復活しない（live 件数 0）。
- 期待する動作: 再追加した曜日の未来の予定が復活する。
- 原因:
  - ルール変更によるアーカイブと、ユーザーによる削除アーカイブを区別していない。
  - `occurrenceExists` はアーカイブ済みの予定も存在扱いするため、再生成されない。
- 修正案:
  - アーカイブ理由を保持する（例: ルール変更 / ユーザー削除）。
  - ルール変更由来のアーカイブは再追加時に復元し、ユーザー削除は復元しない。
  - `occurrenceExists` の扱いもアーカイブ理由に応じて変える。
- 確認状況: 再現確認済み。

## 2. データ整合性・起動時の不具合

### BUG-06 旧データで素材所持数が NaN になる

- 重大度: 高
- 該当箇所:
  - `src/services/appState.ts:104-158` `normalizeAppState`
  - `src/stores/appStore.ts:496-505`
- 再現手順:
  1. `inventory.materials` が `{}` の保存データを読み込む。
  2. 報酬を 1 回受け取る。
- 実際の動作: `shard_sun` / `shard_moon` / `shard_star` がすべて `NaN` になる。
- 期待する動作: 欠損した素材は 0 として加算する。
- 原因:
  - `normalizeAppState` は `inventory` を補完しない。
  - `undefined + number` により `NaN` になる。
- 修正案:
  - `normalizeAppState` で `inventory.currency` と各素材を有限数に正規化する（不足は 0）。
  - 加算側でも `?? 0` を用いて防御する。
- 確認状況: 再現確認済み。

### BUG-07 保存データの検証・正規化が不足し、起動時や週次処理でクラッシュし得る

- 重大度: 高
- 該当箇所:
  - `src/services/appState.ts:71-84` `isValidAppState`
  - `src/services/appState.ts:104-158` `normalizeAppState`
  - `src/stores/appStore.ts:577-583` `evaluateDueWeeks`
  - `src/components/game/GameHUD.tsx:18-20,34,43-60`
- 確認済みの内容:
  - `inventory: null` が `isValidAppState` で `true` になり、正規化後も `null` のまま。
  - `activeSession` を欠いた状態も `isValidAppState` で `true` になり、正規化後は `undefined` のまま。
  - `weeklyProgress.lastEvaluatedWeekStart` の欠落は補完されない。
- 想定される影響:
  - `inventory: null` の場合、`GameHUD` の `inventory.currency` 参照で `TypeError`。
  - `activeSession: undefined` の場合、`activeSession !== null` が `true` になり、`.state` 参照で `TypeError`。
  - `lastEvaluatedWeekStart` が `undefined` の場合、`evaluateDueWeeks` の `nextWeekStartKey(undefined)` で例外。
  - 描画時の例外を捕捉する ErrorBoundary が無いため、画面全体が表示できなくなる可能性がある。
- 原因:
  - `typeof null === 'object'` の考慮漏れ。
  - `activeSession`・`weeklyProgress`・各配列要素の必須フィールド検証が不足。
  - 正規化が一部のフィールドに限定されている。
- 修正案:
  - `isValidAppState` と `normalizeAppState` を強化する。
    - `inventory` は非 null のオブジェクト。
    - `materials` の各キーは有限数。
    - `activeSession` は `null` か、必須フィールドを持つオブジェクト。
    - `weeklyProgress` / `weeklyEvaluations` / `recurrenceRules` / `restWeeks` の型検証。
  - 読み込み失敗時は初期状態へフォールバックし、必要ならユーザーへ通知する。
  - アプリ全体に ErrorBoundary を追加する。
- 確認状況: 不正データが検証を通過することは再現確認済み。実際のクラッシュはコード経路からの想定。

### BUG-08 `appliedRewardSessionIds` が無制限に増える

- 重大度: 低
- 該当箇所: `src/stores/appStore.ts:508`
- 内容: 二重報酬防止のために全セッション ID を永続化しており、長期的に `localStorage` を圧迫する。
- 修正案: 一定件数で剪定する、または `rewards` の `workSessionId` で判定する。

## 3. 入力検証・UX

### BUG-09 `updateTask` が `estimatedMinutes` を検証しない

- 重大度: 中
- 該当箇所:
  - `src/stores/appStore.ts:235-257` `updateTask`
  - 比較: `src/stores/appStore.ts:222` `createTask`
- 再現手順: `updateTask(id, { estimatedMinutes: -5 })` を実行する。
- 実際の動作: `-5` がそのまま保存される。UI の `min` / `max` では防げても、ストア直接呼び出しや将来の API 経由では防げない。
- 期待する動作: 作成時と同様に 1〜480 分の整数へ丸める。
- 修正案: 作成・更新で共通の `sanitizeEstimatedMinutes` を通す。繰り返しルールの作成・更新にも適用する。
- 確認状況: 再現確認済み。

### BUG-10 出撃画面のクエストが週間カレンダー・週次達成に反映されない

- 重大度: 中（仕様確認が必要）
- 該当箇所:
  - `src/features/sortie/QuestCreateModal.tsx:35`
  - `src/features/tasks/TaskForm.tsx:19`
  - `src/domain/weekly.ts:207-222` `isTaskEligibleForWeek`
- 再現手順:
  1. 出撃画面からクエストを作成する。
  2. そのクエストを完了する。
  3. 週次評価を確認する。
- 実際の動作: `scheduledDate` が無いため週次評価の対象外になり、`eligibleTaskCount: 0` / `status: 'pending'` のまま。
- 期待する動作:
  - 「日付ありのタスクのみ週次対象」が仕様なら、UI でその旨を明示する。
  - そうでないなら、作成時に日付を必須または既定値（今日）にする。
- 修正案: 出撃画面とタスク画面の作成フォームに日付入力を追加する、または日付なしタスクを現在週として扱う仕様を決める。
- 確認状況: 再現確認済み。

### BUG-11 進行中タスクをカレンダーから削除すると無言で失敗し、モーダルが閉じる

- 重大度: 低
- 該当箇所:
  - `src/features/calendar/CalendarTaskModal.tsx:140-144`
  - `src/stores/appStore.ts:259-271` `deleteTask`
  - `src/features/tasks/TaskList.tsx:52`
- 内容: `deleteTask` は進行中セッションのタスクなら状態を変えずに返すが、カレンダーのモーダルは成否にかかわらず `onClose()` を呼ぶ。ユーザーには削除できたように見える。
- 修正案: `deleteTask` が成否を返すようにし、失敗時はモーダルを閉じずにメッセージを表示する。または削除ボタンを disabled にする（`TaskList` と同様）。

### BUG-12 TimerPanel の選択状態がタスク一覧と同期しない

- 重大度: 中（BUG-01 の一因）
- 該当箇所: `src/features/tasks/TimerPanel.tsx:24,36-38,52,64,108`
- 内容:
  - `taskId` が `plannedTasks` から消えても保持される。
  - `<select value={taskId}>` が存在しない選択肢を指す状態になり得る。
  - `taskSelected` が「空でない」ことだけを見ており、有効性を検証していない。
- 修正案: 無効な `taskId` を `useEffect` でリセットする。開始時にも対象タスクの状態を再検証する。

## 4. 開発環境

### BUG-13 `npm run lint` が実行できない

- 重大度: 中
- 該当箇所: `package.json` の `scripts.lint` と `devDependencies`
- 実際の動作: ESLint 9 が導入されているが、`eslint.config.(js|mjs|cjs)` が存在しないため失敗する。さらに TypeScript / React 用のパーサー・プラグインが導入されていない。
- 修正案: ESLint の flat config と必要な devDependencies を追加する。lint を採用しない方針ならスクリプトを削除し、型チェックへ一本化する。

## 5. 軽微な問題・改善提案

- タイマーの `aria-live`:
  - `src/features/tasks/TimerPanel.tsx:152`
  - `src/features/sortie/ActiveSortie.tsx:64`
  - 0.5 秒ごとに更新されるため、スクリーンリーダーが常時読み上げる可能性がある。1 秒以上に間引く、または `aria-live` を外す。
- 3D のカーソル:
  - `src/game3d/RoomScene.tsx:61-65,138-141`
  - ポインター上で `cursor: pointer` にしたままコンポーネントが unmount されると、`body` のカーソルが戻らない。cleanup で戻す。
- ビルドサイズ:
  - 単一チャンク約 1,136 kB の警告。Three.js を dynamic import する、`manualChunks` で分割するなどを検討する。不具合ではない。
- デッドコード:
  - `src/features/house/HousePage.tsx` と旧 `CharacterPanel` / `FacilityPanel` は現行ルートから参照されていない。
- 保存データ破損時の挙動:
  - `loadAppState` は不正データを無言で初期状態へ置き換える。ユーザーへの通知やバックアップを検討する。
- ErrorBoundary:
  - 描画時の例外で画面全体が白画面になる。データ検証の強化と併せて導入する。

## 6. 推奨修正順

1. BUG-01（完了タスクの報酬無限取得）
2. BUG-02（派遣キャラクターが無意味になっている）
3. BUG-06 / BUG-07（NaN と起動時クラッシュ）
4. BUG-04 / BUG-05（繰り返し予定の重複・消失）
5. BUG-03（中断時の報酬二重係数）
6. BUG-09 / BUG-10 / BUG-11 / BUG-12
7. BUG-13 と軽微な改善

## 7. 再現確認の記録

一時テストで確認した結果:

- 派遣キャラクターを `['c-hinata']` に限定しても、所持キャラクター全員で素材が計算された。
- 繰り返し予定を月曜から火曜へ移動後、月曜が再生成され `['2026-10-20', '2026-10-19']` の 2 件になった。
- 繰り返しルールから曜日を削除して再追加すると、live 件数が 0 のままだった。
- `inventory.materials = {}` で報酬付与すると、全素材が `NaN` になった。
- `inventory: null` と `activeSession` 欠落が `isValidAppState` を通過し、正規化後も不正な値が残った。
- `status: 'completed'` のタスクで `startSession` が成功した。
- 日付なしで作成したクエストを完了しても、週次評価は `eligibleTaskCount: 0` / `status: 'pending'` だった。
- `updateTask` で `estimatedMinutes: -5` がそのまま保存された。
- 中断時の施設生産素材が `2` になり、期待値 `5` に対して二重に係数が適用されていた。
