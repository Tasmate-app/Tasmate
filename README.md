# Tasmate — 現実の行動を報酬に変える生活支援ゲーム（プロトタイプ）

タスク・勉強への取り組みを、キャラクターの成長・素材収集・拠点発展につなげる生活支援型育成ゲーム。
まずはローカルで動作するプロトタイプとして、基本ループ（タスク → タイマー → 報酬 → 育成）を検証する。

## 必要環境

- Node.js 20 以上（推奨 22）
- npm 10 以上

Windows では PowerShell が基本シェル。`npm.ps1` の実行が制限される環境では
`npm.cmd` を直接呼ぶ（例：`& "C:\Program Files\nodejs\npm.cmd" install`）。

## セットアップ・起動

```powershell
npm install
npm run dev      # 開発サーバー起動（http://localhost:5173）
npm run preview  # 本番ビルドの確認用サーバー（事前に npm run build）
```

## モノレポ構成

Web版とExpo React Native版で型・ゲームロジックを共有する。

- `src/` … 既存Web版（ルートの `package.json` から起動）
- `apps/mobile/` … Expo React Native版
- `packages/types/` … 共通型 `@tasmate/types`
- `packages/core/` … 共通ゲームロジック・アプリ状態・ストア・保存抽象 `@tasmate/core`
- `packages/design-tokens/` … Web/Native 共通デザイントークン `@tasmate/design-tokens`

```powershell
npm run typecheck -w tasmate-mobile
npm run doctor -w tasmate-mobile
npm run export:android -w tasmate-mobile
npm run export:ios -w tasmate-mobile
```

## Android APK のローカルビルド（Windows）

Expo の prebuild とローカルの Android SDK（Gradle）を使い、EAS を介さず APK を作成する。

### 必要環境

- JDK 17（`JAVA_HOME` を設定）
- Android Studio / Android SDK
  - SDK Platform 37
  - Build-Tools 37.0.0
  - Platform-Tools
  - NDK 27.1.12297006
  - CMake 3.31.6（Windows の長いパス対策）
- 環境変数 `ANDROID_HOME`（例: `%LOCALAPPDATA%\Android\Sdk`）

### ビルド

```powershell
npm run apk:release -w tasmate-mobile
```

出力: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

端末へ導入:

```powershell
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

- `release` は Expo テンプレートの debug キーで署名されるため、そのまま端末へ導入できる。
- `debug` APK は Metro の起動が必要なため、単体確認には `release` を使う。
- ネイティブ設定を変更した場合は `npm run prebuild:android -w tasmate-mobile -- --clean` で再生成する。
- `apps/mobile/android/` は生成物のためコミットしない。
- 初回は Gradle・Android SDK・NDK のダウンロードで数 GB と時間がかかる。

## テスト・検証

```powershell
npm run typecheck  # TypeScript 型チェック
npm run test       # Vitest 単体テスト（ゲームロジック中心）
npm run build      # 型チェック + 本番ビルド
npx playwright install chromium  # E2E 初回のみ
npm run e2e        # Playwright スモークテスト（dev サーバーを自動起動）
```

## 画面

ゲーム一体型UI。上部HUD（ロゴ・通貨・素材・作業状態）とナビで全画面を操作する。
ナビはモバイルでは下部バー、1024px以上では左サイドバーに切り替わる。デザインは
`packages/design-tokens/` を正とし、Webでは起動時にCSS変数へ適用する。

- `/` ホーム：3Dシェアハウスが画面を占める。キャラ・施設を選択すると
  コンテキストパネルが開き、詳細・育成・強化へ進める
- `/sortie` 出撃：クエスト選択、作業中（タイマー・探索進行）、完了リザルトを分離表示。
  クエスト作成は独立したモーダル。完了後はキャラクターが休憩を提案し、
  設定した休憩時間はHUDに表示される。連続作業時は応援イベントが発生する
- `/calendar` 計画：週間カレンダー、繰り返し予定、80%週間達成、連続達成ランク、
  報酬倍率、休息週、週次判定履歴。予定は時刻付き・時刻なしの両方に対応
- `/companions` 仲間：一覧から選んで専用ステータス画面を開く（戻る操作で一覧へ）
- `/facilities` 施設：一覧から選んで詳細（生産・コスト・稼働切替・強化）を開く
- `/shop` ショップ：施設強化の購入（家具・コスチュームは準備中）
- `/storage` 倉庫：報酬履歴の確認
- `/settings` 設定：データのバックアップ書き出し・復元・リセット、アプリ情報、
  OSSライセンスの導線（一覧は #23 で追加予定）
- `/house` は `/` へリダイレクト（旧URL互換）

## データ保存

- アプリ状態とストアは `packages/core/` で共有する。UI は直接保存先を触らず、
  ストアのアクション経由で保存する。
- Web は `localStorage`（キー `tasmate:state:v1`）へ保存し、起動時は同期読み込みで復元する。
  Native は同じキー・JSON構造を `AsyncStorage` に保存し、起動後に非同期で復元する。
- 保存は 150ms のデバウンスと直列キューで行い、復元前の状態は保存しない。
  保存失敗時は `storageError` に記録し、アプリの動作は継続する。
- タイマーは開始時刻を基準に経過時間を算出するため、再読み込み・バックグラウンド化後も
  作業状態が復元される。
- `/settings` からアプリ状態を JSON ファイルとして書き出し・復元できる。バックアップには
  進行中のタイマー・休憩を含めず、復元時は現在の状態を上書きして進行中セッションを解除する。
  ファイルは最大 5MB。Web はダウンロードとファイル選択、Native は共有シートとファイル選択を使う。
  最終バックアップ日時は `AppState.settings.lastBackupAt` に保存する。
- 週次判定は未判定の過去週を古い順に処理し、`weekStart` 単位で冪等に記録する。
  週の開始は月曜 00:00（ローカル時刻）、達成条件は80%以上。
- 週間カレンダー・継続報酬の仕様は
  [`docs/06_weekly_calendar_and_streak.md`](docs/06_weekly_calendar_and_streak.md) を参照。
- Supabase / AI API の接続は後続フェーズ。AI 報酬は `src/services/rewardService.ts` に
  集約済みで、暫定ルール（`src/domain/`）がフォールバックとして残る設計。

## 仮実装の一覧（仕様未確定のため固定しないこと）

- 報酬ルール・全数値（`src/domain/constants.ts` の `BALANCE`）
- 属性は3種＋無属性、相性倍率 1.5（`docs/02` §4 は未決定）
- 同時進行セッションは1件まで
- キャラ初期所持2人、施設2種、素材3種（`src/data/seed.ts`）
- 通貨初期値 100、中断時報酬係数 0.5、下限 60 秒未満は報酬なし
- 仕様確定後は `docs/` とテストを合わせて更新すること

## 設計資料

- [`docs/01_project_overview.md`](docs/01_project_overview.md)：目的、コンセプト、成功条件
- [`docs/02_game_design.md`](docs/02_game_design.md)：ゲームループ、タスク・報酬、育成、施設、拠点の仕様案
- [`docs/03_feature_list.md`](docs/03_feature_list.md)：機能一覧、優先度、MVP の範囲
- [`docs/04_data_design.md`](docs/04_data_design.md)：データモデルのたたき台
- [`docs/05_roadmap_and_open_questions.md`](docs/05_roadmap_and_open_questions.md)：開発段階、未決定事項
- [`docs/06_weekly_calendar_and_streak.md`](docs/06_weekly_calendar_and_streak.md)：週間カレンダー、繰り返し、達成判定、継続報酬
- [`docs/characters/voxel-character-standard.md`](docs/characters/voxel-character-standard.md)：基準ボクセルキャラクターの寸法・座標・テクスチャ・書き出し規格
- [`docs/characters/parts-and-naming.md`](docs/characters/parts-and-naming.md)：パーツ階層と命名規則

## キャラクター素材

基準モデルは `public/assets/characters/base/` に格納している。

- `tasmate_character_base.bbmodel`：Blockbench 編集用の原本
- `tasmate_character_base.glb`：ゲーム読み込み用（身長 24 unit、1 unit = 1 ボクセル）
- `tasmate_base_atlas.png`：単一アトラステクスチャ（256×256、顔領域込み）
- `screenshots/`：正面・側面・背面・斜めからの確認画像

GLB は 1 unit = 1 ボクセルで出力している。three.js 側では用途に応じて
`scale`（例：身長 1.6m 相当なら `1.6 / 24 ≈ 0.067`）を設定する。

数値、報酬式、属性倍率、施設生産量などは未確定。実装時に推測で固定せず、仕様決定後に更新する。
