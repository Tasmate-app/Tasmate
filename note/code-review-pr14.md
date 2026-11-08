# コードレビュー: PR #14（Expo 移行 / `feature/react-native`）

- 日付: 2026-11-08
- 対象: `03d5723`（PR #14 マージコミット）時点の `main`
- 対象範囲: `apps/mobile`、`packages/core`、`packages/types`、web 側の再エクスポート、ビルド/検査設定
- 方法: 静的レビュー（コード読解）。テスト・型チェック・lint は未実行
- 優先順位: 正しさ → セキュリティ → データ消失 → 回帰 → 並行性/状態 → 性能 → 保守性 → スタイル

## サマリ

| 重要度 | 件数 | 概要 |
| --- | --- | --- |
| Critical / High | 0 | なし |
| Medium | 2 | 破損保存データの即時上書き、モバイルが品質ゲート対象外 |
| Low | 7 | 完了タスクの予定日変更、時刻検証不足、Android UI、タイマー多重化 ほか |
| 仕様確認 | 1 | 未来週タスクを週前に削除した場合の週次分母の扱い |

セキュリティ上の問題（秘匿情報の露出、危険な入力処理、外部通信）は確認されなかった。保存先は localStorage / AsyncStorage のみ。

---

## Medium

### M-1: 破損した保存データがほぼ即座に初期状態で上書きされる（データ消失）

**該当箇所**
- `packages/core/src/store.ts:486-489`（保存なし/破損時の hydrate 分岐）
- `packages/core/src/store.ts:1058-1060`（購読による保存スケジュール）
- `packages/core/src/store.ts:416-430`（`scheduleSave`）
- `packages/core/tests/store.test.ts:246-255`（既存テスト）

**内容**
hydrate の破損データ分岐は「破損データを復元する前に上書きしない。次の状態変更まで保存を待つ」とコメントしているが、実際には待てていない。

1. `loadAppStateFromStorage` が「JSON は読めたが `isValidAppState` で不正」を返すと、`canPersist = true` にしたうえで `lastSavedJson = JSON.stringify(toAppStateSnapshot(initialAppState()))` を設定する（`store.ts:488`）。
2. この `initialAppState()` はストア生成時の `startState` とは別インスタンスで、`weeklyProgress.updatedAt` が異なる。
3. 直後の `store.setState({ hasHydrated: true, storageError })`（`store.ts:489`）が購読者を発火し、`scheduleSave` が走る。
4. `lastObservedJson` は `null` のままなので現在の初期状態を保存対象と判断し、`enqueueJson` → `pump` でストレージへ書き込む（`json !== lastSavedJson` のため抑制されない）。
5. 結果として、ユーザー操作がなくてもデバウンス（既定 150ms）後に破損データが初期状態で上書きされる。

**影響**
- 旧バージョンのタブが新しいスキーマの保存データを読んだ場合や、1 フィールドでも形式不正な保存データが、復旧・退避の機会なく消える。
- `isValidAppState` は 1 件の不正で全体を拒否するため、部分的に有効なデータも巻き添えになる。
- 既存テストは「初期状態で起動すること」しか検証しておらず、元データが保持されることを確認していない。

**修正案**
- 保存なし/破損パスで、`lastSavedJson` を「現在の state」から作り、`lastObservedJson` も同じ値に設定する。
- または hydrate 中の `setState` を保存対象外にするフラグ（`hydrating` など）を設ける。
- 破損データを別キーへ退避（バックアップ）する。
- 「破損データがユーザー操作まで保持される」テストを追加する。

---

### M-2: `apps/mobile` がルートの型チェック・lint・CI の対象外

**該当箇所**
- `package.json:11-18`（`typecheck` / `lint` / `test`）
- `tsconfig.json:28`（`include` に `apps` が無い）
- `eslint.config.js:13`（`files` に `apps/mobile` が無い）
- `apps/mobile/package.json` の `typecheck` は手動実行のみ
- `.github` ディレクトリが存在しない（CI なし）

**内容**
npm workspaces で `apps/*` を含めているが、ルートの `tsc --noEmit` は `src` / `tests` / 設定ファイルのみ、ESLint も `src` / `tests` / `packages` のみを対象にしている。`apps/mobile` は独自の `typecheck` スクリプトを持つが、ルートからも CI からも呼ばれない。

**影響**
モバイル側の型エラーや lint 違反が PR をすり抜ける。Expo のアップグレード時に壊れていても気付けない。

**修正案**
- `typecheck:mobile` を追加する、または `npm run typecheck --workspaces --if-present` で一括実行する。
- ESLint に React Native 向け globals を設定して `apps/mobile` を追加する。
- CI（GitHub Actions）で web と mobile の型チェック・lint・テストを実行する。

---

## Low

### L-1: 完了タスクの予定日を後から変更でき、週次集計を操作できる

**該当箇所**
- `packages/core/src/store.ts:534-560`（`updateTask` が status に関係なく `scheduledDate` を更新）
- `apps/mobile/src/features/sortie/WeeklyPlannerSection.tsx:101`（完了タスクも一覧に出る）
- `apps/mobile/src/features/sortie/TaskEditorModal.tsx:112`（常に `updateTask` を呼ぶ）

**内容**
週間計画には完了タスクも表示され、編集モーダルから予定日を変更できる。完了タスクを別の週へ移動すると、まだ判定されていない週の達成率を上げ下げできる（過去週の評価はスナップショットのため影響しない）。

**修正案**
`status === 'completed'` のタスクは予定日の変更を禁止する、または評価用の日付を別フィールドで固定する。

---

### L-2: 保存データの時刻文字列の検証不足（NaN の混入）

**該当箇所**
- `packages/core/src/appState.ts:145-167`（`isWorkSession` は文字列型のみ検証）
- `packages/core/src/session.ts:10-21`（`elapsedSeconds` は `Date.parse` の `NaN` をそのまま返す）

**内容**
`startedAt` / `pausedAt` / `endedAt` / `evaluatedAt` のパース可否を検証していない。形式が正しい（文字列である）が日時として不正な保存データを読み込むと、経過時間や報酬が `NaN` になり得る。`JSON.stringify(NaN)` は `null` になるため、次回ロードで全体が不正判定され、M-1 の上書き経路に繋がる。

**修正案**
ロード時に ISO 日時の妥当性を検証する。`elapsedSeconds` でも非有限値は 0 に丸める。

---

### L-3: Android のキーボード／タブバー挙動

**該当箇所**
- `apps/mobile/src/ui/ModalSheet.tsx:25-26`（Android は `behavior={undefined}`）
- `apps/mobile/src/components/GameTabBar.tsx:24`（キーボード表示中に `null` を返す）

**内容**
Android では `KeyboardAvoidingView` の `behavior` が未指定のため、モーダル内の入力欄がキーボードに隠れる可能性がある。タブバーが `null` になると高さが消えてレイアウトが跳ねる。

**修正案**
Android は `behavior="height"`（または `windowSoftInputMode` の設定）を使う。タブバーは高さ 0 のプレースホルダを返すか、`display: 'none'` 相当で高さを維持する。

---

### L-4: 1 秒タイマー（`useNow`）の多重実行

**該当箇所**
- `apps/mobile/src/components/GameHUD.tsx:35`
- `apps/mobile/src/components/GameRuntime.tsx:38`
- `apps/mobile/src/features/sortie/ActiveSortiePanel.tsx:27`
- `apps/mobile/src/features/sortie/RewardResultPanel.tsx:97`
- ほかに 10 秒 / 30 秒 / 60 秒のインターバル

**内容**
セッション中は複数の独立した 1 秒インターバルが同時に動き、それぞれが再描画を起こす。

**修正案**
ルートで 1 本の共通クロック（Zustand など）に集約し、必要な粒度ごとに購読する。

---

### L-5: 初回起動時の冗長な書き込み

**該当箇所**
- `packages/core/src/store.ts:488`

**内容**
`lastSavedJson` を別インスタンスの `initialAppState()` から作るため、状態が変わっていなくても初回に 1 回書き込む。M-1 と同じ根因。M-1 の修正で併せて解消する。

---

### L-6: 休憩中に新しいクエストを開始すると休憩が暗黙終了する

**該当箇所**
- `packages/core/src/store.ts:756`（`startSession` がアクティブな `restSession` を `null` にする）
- `apps/mobile/src/screens/SortieScreen.tsx`（休憩パネルとクエストボードを同時表示）

**内容**
確認なしに進行中の休憩が破棄される。休憩完了の記録やサポートイベントが失われる可能性がある。

**修正案**
休憩中に開始する場合は確認ダイアログを出す、または休憩パネル表示中はボードからの開始を抑止する。

---

### L-7: `router.push('/character')` によるタブ移動

**該当箇所**
- `apps/mobile/src/screens/BaseScreen.tsx:197`
- `apps/mobile/src/screens/BaseScreen.tsx:291`

**内容**
タブ切替が目的だが `push` のため履歴が積まれ、Android の戻る操作で意図しない画面に戻る可能性がある。

**修正案**
`router.navigate` または `router.replace` を使う。

---

## 仕様確認したい点

### S-1: 未来週のタスクを週が始まる前に削除した場合の週次分母

**該当箇所**
- `packages/core/src/weekly.ts:207-221`（`isTaskEligibleForWeek`）
- `tests/weekly.test.ts:171-185`

**内容**
現在の実装は「週の途中で作成かつ削除された一時タスク」のみ分母から除外する。そのため、**未来週向けに作成し、その週が始まる前に削除したタスク**は、その未来週の分母に残り続け、達成率を恒久的に下げる。

アンチゲーミング（削除によるノルマ逃れ防止）として意図的であれば仕様として明記が必要。意図外であれば、除外条件を次のように変更する。

```
createdMs < weekEndMs && archivedMs >= weekStartMs
```

ただし「同週に作成・同週に削除」は除外する既存仕様（`tests/weekly.test.ts:171-177`）を維持する必要がある。

---

## 確認できた良い点

- 報酬の冪等性: `appliedRewardSessionIds` と決定的な `reward-${session.id}` により二重付与を防止。
- 読み込み失敗時: `canPersist = false` にして既存データの上書きを防いでいる（`store.ts:478-484`）。
- 保存キュー: 直列化、JSON 重複排除、失敗時の `failedJson` リトライが実装されている。
- `occurrenceExists` がアーカイブ済みタスクも考慮し、削除済みの繰り返し予定を再生成しない。
- web 側 `src/domain/*` / `src/services/*` は `@tasmate/core/*` の再エクスポートのみで、ロジックの二重管理がない。
- ストレージは `StorageAdapter` で抽象化され、Web（localStorage）と Native（AsyncStorage）で同一の JSON 形式を共有している。

---

## 次のアクション（推奨順）

1. M-1（破損データ上書き）の修正とテスト追加
2. M-2（mobile の型チェック・lint・CI 整備）
3. L-1（完了タスクの予定日変更禁止）
4. L-2（時刻検証と NaN 防御）
5. L-3〜L-7（UI / 性能 / 操作性の改善）
6. S-1 の仕様確定とドキュメント反映
