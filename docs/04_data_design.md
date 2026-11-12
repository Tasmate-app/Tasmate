# データ設計のたたき台

> これは実装言語やデータベースを決める前の概念モデル。フィールドや型は案であり、確定仕様ではない。

## 1. 設計方針

- タスクの記録とゲーム内報酬の記録を分ける。
- キャラクターや施設の定義データと、プレイヤーが所有する状態データを分ける。
- AI の報酬提案は、アプリ側で検証してから確定する。
- 報酬の付与・消費は履歴として残し、二重付与や残高不整合を防ぐ。
- 時刻は保存時にタイムゾーンの扱いを統一する。表示はユーザーのローカル時刻に合わせる。

## 2. 主なエンティティ

### PlayerProfile

プレイヤーの基本情報。

| フィールド案 | 意味 |
|---|---|
| id | プレイヤー ID |
| createdAt | 作成日時 |
| settings | アプリ設定（バックアップ日時など） |
| currentCurrency | 通貨残高（別の台帳から算出する設計も可） |

### Task

現実で取り組むタスクや勉強内容。

| フィールド案 | 意味 |
|---|---|
| id | タスク ID |
| title | タスク名 |
| description | 詳細 |
| category | 勉強・作業などのカテゴリ |
| subject | 勉強科目（任意） |
| estimatedMinutes | 予定時間。ストップウォッチは 0（予定時間なし） |
| timerMode | estimate / stopwatch（任意。未指定は estimate 相当） |
| scheduledAt | 予定日時（任意、旧データ互換） |
| scheduledDate | 予定日（ローカル日付キー）。stopwatch でも任意で設定可能 |
| startTime / endTime | 同日の開始・終了時刻（任意） |
| recurrenceId | 生成元の繰り返しルール ID（任意） |
| originalScheduledDate | 日付移動前のルール上の予定日（任意） |
| archivedAt | 論理削除日時（任意） |
| archiveReason | アーカイブ理由。user / rule（任意） |
| status | planned / active / completed / cancelled など |
| createdAt | 作成日時 |
| updatedAt | 更新日時 |

`timerMode` は予定時間の扱いだけを表し、予定日・時刻の有無とは独立している。stopwatch でも `scheduledDate` / `startTime` / `endTime` を保持でき、週間カレンダーや次のクエストに表示される。

### RecurrenceRule

毎週の予定を生成するルール。

| フィールド案 | 意味 |
|---|---|
| id | ルール ID |
| title / description | 予定名・内容 |
| category / subject | カテゴリ・科目 |
| estimatedMinutes | 予定時間 |
| frequency | 現状は weekly |
| daysOfWeek | 繰り返す曜日（1=月〜7=日） |
| startTime / endTime | 同日の時刻（任意） |
| effectiveFrom / effectiveUntil | 適用開始日・終了日 |
| isActive | 有効状態 |
| createdAt / updatedAt | 作成・更新日時 |

### WorkSession

タスクに取り組んだ一回分の記録。

| フィールド案 | 意味 |
|---|---|
| id | セッション ID |
| taskId | 対象タスク ID |
| startedAt | 開始日時 |
| endedAt | 終了日時（任意） |
| elapsedSeconds | 経過時間 |
| activeSeconds | 実際に作業した時間の扱い（定義要） |
| result | completed / interrupted など |
| timerMode | estimate / stopwatch（開始時点のスナップショット） |
| destinationId | 選択した戦闘先 ID |
| assignedCharacterIds | 派遣キャラクター ID 一覧 |

### RestSession

作業後の休憩。直近1件を保存し、再読み込み後も残り時間を復元する。

| フィールド案 | 意味 |
|---|---|
| id | 休憩 ID |
| startedAt | 休憩開始日時 |
| plannedMinutes | プレイヤーが設定した休憩時間（分） |
| sourceSessionId | 休憩のきっかけになった作業セッション ID（任意） |
| state | active / completed |
| endedAt | 休憩完了日時（任意） |

### SupportEvent

連続作業や長時間作業、休憩完了時に表示するキャラクターの応援イベント。

| フィールド案 | 意味 |
|---|---|
| id | イベント ID |
| kind | consecutive-work / long-work / rest-complete |
| characterId | 声をかけたキャラクター ID |
| message | 表示するセリフ |
| workSessionId | 関連する作業セッション ID（任意） |
| createdAt | 発生時刻 |
| seen | プレイヤーが確認済みか |

### AppSettings

アプリ全体のユーザー設定。現状はバックアップ状態のみを持つ。

| フィールド案 | 意味 |
|---|---|
| lastBackupAt | 最後にバックアップを書き出した日時（ISO 8601）。未実施は null |

### RewardRecord

タスクや作業セッションから発生した報酬の記録。

| フィールド案 | 意味 |
|---|---|
| id | 報酬記録 ID |
| workSessionId | 対象セッション ID |
| inputSummary | AI に渡した入力の要約 |
| proposedReward | AI の報酬提案 |
| baseReward | 週間倍率を適用する前の確定報酬（任意） |
| rewardMultiplier | 適用した週間継続倍率（任意・旧データは1） |
| finalReward | 検証後に確定した報酬 |
| reason | 報酬理由 |
| createdAt | 確定日時 |
| status | pending / approved / rejected など |

### WeeklyProgress

週間継続の現在状態。ランクと倍率は保存せず、`currentStreak` から算出する。

| フィールド案 | 意味 |
|---|---|
| userId | 対象ユーザー（現状は `local-user`） |
| trackingStartedWeek | 集計を開始した週の月曜日 |
| currentStreak | 現在の連続達成週数 |
| totalSuccessfulWeeks | 累計達成週数 |
| highestStreak | 最高連続達成週数 |
| lastEvaluatedWeekStart | 最後に判定した週 |
| updatedAt | 更新日時 |

### WeeklyEvaluation

1週間ごとの判定履歴。`weekStart` は一意。

| フィールド案 | 意味 |
|---|---|
| id / userId | 判定 ID・対象ユーザー |
| weekStart / weekEnd | 対象週の開始日（月曜）と終了日（翌週月曜） |
| status | achieved / missed / pending / rest |
| eligibleTaskCount / completedTaskCount | 対象数・完了数 |
| completionRate | 達成率（対象0件は null） |
| streakBefore / streakAfter | 判定前後の連続週数 |
| multiplierBefore / multiplierAfter | 判定前後の報酬倍率 |
| evaluatedAt | 判定日時 |
| ruleVersion | 判定ルールのバージョン |
| taskIds | 判定対象タスク ID |

休息週は `restWeeks` に週開始日を保持する。週次判定は未判定の過去週を古い順に処理し、同じ週を再判定しない。

### CharacterDefinition / OwnedCharacter

キャラクターの定義情報と、プレイヤーが所有する状態を分ける。

| フィールド案 | 意味 |
|---|---|
| id | キャラクター ID |
| name | 表示名 |
| attribute | 属性 |
| baseEfficiency | 基本収集効率 |
| ownedLevel | 所有キャラクターのレベル |
| experience | 経験値 |
| unlockedCostumes | 解禁済みコスチューム |

実際の設計では、定義データと所有状態を別テーブル・別 JSON などに分ける。

### Destination

素材収集先・戦闘先の定義。

| フィールド案 | 意味 |
|---|---|
| id | 戦闘先 ID |
| name | 表示名 |
| availableMaterials | 入手可能素材と確率・比率 |
| baseEfficiency | 基本収集効率 |
| recommendedAttributes | 相性のよい属性 |
| unlockCondition | 解禁条件 |

### FacilityDefinition / OwnedFacility

施設の定義情報と、プレイヤーが所有する施設状態。

| フィールド案 | 意味 |
|---|---|
| id | 施設 ID |
| type | currency / material / synthesis など |
| level | 施設レベル |
| productionRate | 基本生産量 |
| upgradeCost | 強化コスト |
| enabled | 利用可能状態 |

施設の定義データと所有状態は分ける。作業中だけ稼働する条件や生産の確定方法はゲーム仕様に合わせて決める。

### InventoryItem / CurrencyLedger

所持素材・アイテムと、通貨・素材の増減履歴。

| フィールド案 | 意味 |
|---|---|
| itemId | アイテム ID |
| quantity | 所持数 |
| source | 入手元 |
| reason | 増減理由 |
| relatedSessionId | 関連セッション（任意） |
| createdAt | 記録日時 |

残高だけでなく、可能であれば増減履歴を記録する。報酬の再処理時に二重付与しないため、各付与処理に一意な ID を持たせる。

### Furniture / Costume / GiftRecipe

拠点アイテム、コスチューム、プレゼント合成レシピの定義データ。購入・所持・配置・解禁状態はプレイヤーごとの所有データとして管理する。

## 3. エンティティ間の関係（概念）

- `Task` 1件に対して、複数の `WorkSession` が存在し得る。
- `WorkSession` は1つの `Destination` を参照し、複数キャラクターを派遣できる。
- `WorkSession` から `RewardRecord` が生成される。
- 報酬や収集結果は `InventoryItem` / `CurrencyLedger` に反映される。
- `OwnedCharacter` はキャラクター定義を参照し、レベルや経験値を持つ。
- `OwnedFacility` は施設定義を参照し、レベルや稼働状態を持つ。

## 4. AI 報酬決定の入出力案

### 入力候補

- タスク名・説明・カテゴリ
- 勉強科目（該当する場合）
- 予定時間と実作業時間
- 完了・中断などの結果
- 継続実績（採用する場合）
- 報酬システムの上限・許容範囲

### 出力候補

- 報酬カテゴリ
- 報酬量の提案
- 決定理由の短い説明
- 信頼度や要確認フラグ（必要な場合）

### 検証ルール案

- 出力形式・型を検証する。
- 許容範囲外の報酬量を拒否または補正する。
- 存在しないアイテム ID を拒否する。
- 同じセッションへの二重報酬付与を防ぐ。
- AI の応答が失敗した場合の再試行・暫定報酬ルールを定義する。

## 5. 未決定事項

- 保存先（現状はローカルのみ。クラウド併用は未定）
- アカウントや複数端末同期の要否
- 使用する DB・ORM・データ形式
- オフライン時のタイマーや報酬確定
- クラウド同期時のデータ削除・エクスポート方法
- プライバシー上、AI に送信するタスク情報の範囲

### 実装済みの AppState 拡張

| フィールド | 意味 |
|---|---|
| itemInventory | 全キャラクター共通のアイテム所持数 |
| itemHistory | アイテム増減履歴（上限500件） |
| taskRewards | タスク完了報酬の抽選結果（上限500件） |
| stardustCarry | 星屑の端数（分） |
| OwnedCharacter.ascensionStage | レベル上限解放の段階（0〜5） |
| settings | アプリ設定（`lastBackupAt`） |

既存の `Inventory`（currency / shard_*）は互換維持のため残し、`itemInventory` の通貨・旧素材と同期する。旧保存データは `inventory` から `itemInventory` を補完する。`settings` がない旧データは `{ lastBackupAt: null }` を補完する。

## 6. ローカル保存とバックアップ

- Web は `localStorage`（キー `tasmate:state:v1`）、Native は同じキー・JSON 構造を `AsyncStorage` に保存する。
- バックアップは次の形式で書き出す。

```json
{
  "format": "tasmate-backup",
  "formatVersion": 1,
  "exportedAt": "2026-11-12T09:30:00.000Z",
  "state": { "...AppState..." }
}
```

- 生の `AppState` JSON も復元入力として受け付ける。
- バックアップと復元では `activeSession` / `restSession` を破棄する。復元は現在の状態を上書きし、形式付きバックアップの場合は `lastBackupAt` に `exportedAt` を記録する。生の `AppState` は保存されている設定を正規化して使う。
- ファイルサイズの上限は 5MB。形式・`version`・主要フィールドを検証し、不正なデータは状態へ反映しない。
- データリセットは確認入力「リセット」を必要とし、`AppState` を初期状態へ戻す。
