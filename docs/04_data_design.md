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
| settings | タイマーなどの設定 |
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
| estimatedMinutes | 予定時間 |
| scheduledAt | 予定日時（任意） |
| status | planned / active / completed / cancelled など |
| createdAt | 作成日時 |
| updatedAt | 更新日時 |

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
| destinationId | 選択した戦闘先 ID |
| assignedCharacterIds | 派遣キャラクター ID 一覧 |

### RewardRecord

タスクや作業セッションから発生した報酬の記録。

| フィールド案 | 意味 |
|---|---|
| id | 報酬記録 ID |
| workSessionId | 対象セッション ID |
| inputSummary | AI に渡した入力の要約 |
| proposedReward | AI の報酬提案 |
| finalReward | 検証後に確定した報酬 |
| reason | 報酬理由 |
| createdAt | 確定日時 |
| status | pending / approved / rejected など |

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

- 保存先（ローカル、クラウド、または併用）
- アカウントや複数端末同期の要否
- 使用する DB・ORM・データ形式
- オフライン時のタイマーや報酬確定
- データ削除・エクスポート方法
- プライバシー上、AI に送信するタスク情報の範囲
