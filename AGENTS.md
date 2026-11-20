# AGENTS.md

## プロジェクト概要
本プロジェクトは、現実の勉強・タスク管理とゲームの進行を連動させる生活支援型ゲームである。ユーザーが実際に作業することで、ゲーム内素材・通貨・キャラクター育成資源などを獲得できる。

主な機能：
- タスク管理、勉強計画、作業タイマー
- 作業実績に応じた報酬
- キャラクター育成・編成・探索
- 施設による素材・通貨の生産
- 家具・施設・コスチューム
- 3Dシェアハウス
- 将来的な複数ユーザー対応

ゲーム要素は現実の作業継続を支援するためのもの。タスク管理とタイマーの信頼性・使いやすさを損なわない。

現在はローカル保存を前提としたプロトタイプで、Web版（Vite + React）とNative版（Expo React Native）をnpm workspacesで管理している。

## 最優先事項
1. タスク管理とタイマーの信頼性
2. ゲームルールの正確性とテスト容易性
3. 3D描画とゲームロジックの分離
4. 安全なデータ管理と将来の複数ユーザー対応
5. 使いやすく一貫性のあるゲームUI
6. WebとNativeで共有ロジックの一貫性を保ち、段階的に開発する

## 基本方針
- 実装前に既存コードと関連ドキュメントを確認する。
- 既存の設計方針・命名規則・依存関係を尊重する。
- 仕様が明確な部分は自律的に実装し、曖昧な部分は仮定を明記する。
- 指示されていない大規模変更や依存関係追加を避け、最小限の変更で目的を達成する。
- 機能追加時はWeb・Native両方への影響を確認する。
- 未完成の機能を完成済みとして扱わない。エラーを握りつぶさない。
- 不必要な抽象化や過剰な設計を避け、最小構成から段階的に拡張する。

## リポジトリ構成
- `apps/mobile/`：Expo React Native版。`app/` にExpo Routerのルート、`src/` に画面・UI・Native固有処理
- `packages/core/`：Web/Native共通のゲームロジック、ストア、保存抽象、バックアップ、週次判定
- `packages/types/`：共有型定義
- `packages/design-tokens/`：色・余白・角丸・影・モーションなどの共通デザイントークン
- `packages/task-evaluation/`：キーワードによるタスク評価（結晶タイプ・難易度）
- `src/`：Web版。`src/domain/` と `src/services/` は共有パッケージの再エクスポートやWeb専用アダプタ
- `tests/`：Vitest単体テストとPlaywright E2E
- `docs/`：仕様・設計ドキュメント
- `note/`：補助メモ。仕様の正ではない
- `public/assets/`：Web版の画像・3Dモデル
- `scripts/`：ライセンス生成などの補助スクリプト
- `supabase/`：将来導入予定。現時点では存在しない

実際の構成と依存関係は `package.json`、各workspaceの `package.json`、ロックファイルを確認する。

## ドキュメント
仕様の正は `docs/` とコードである。存在を確認せずにあるものとして扱わない。

| ドキュメント | 内容 |
| --- | --- |
| `README.md` | セットアップ、起動、ビルド、テスト、画面構成 |
| `docs/01_project_overview.md` | 目的、コンセプト、主な画面 |
| `docs/02_game_design.md` | ゲームループ、タスク・報酬、育成、施設、拠点 |
| `docs/03_feature_list.md` | 機能一覧、優先度、MVP範囲 |
| `docs/04_data_design.md` | データモデル、保存、タスク評価の入出力 |
| `docs/05_roadmap_and_open_questions.md` | 開発段階、未決定事項、意思決定ログ |
| `docs/06_weekly_calendar_and_streak.md` | 週間カレンダー、繰り返し、達成判定、継続報酬 |
| `docs/07_react_native_plan.md` | Native版・モノレポ化の調査と実装計画 |
| `docs/privacy-policy.md` | 取得情報、保存場所、外部送信 |
| `docs/characters/*.md` | ボクセルキャラクターの規格、パーツ階層、命名規則 |

ドキュメント間の矛盾を見つけたら影響範囲を調査し、重要仕様を独断で変更せず、矛盾と解決案を報告する。

## 仕様変更時のドキュメント更新
仕様や振る舞いを変更するときは、実装前に以下の表で更新対象を確認する。該当なしと判断した場合も、その理由を確認する。

| 変更領域 | 確認・更新するドキュメント |
| --- | --- |
| 報酬、ドロップ、育成、施設、結晶合成、経済バランス | `docs/02_game_design.md`、`docs/04_data_design.md`、`README.md` の仮実装一覧 |
| タスク、タイマー、中断・再開、作業履歴 | `docs/01_project_overview.md`、`docs/02_game_design.md`、`docs/04_data_design.md` |
| 週間カレンダー、繰り返し、週次判定、休息 | `docs/04_data_design.md`、`docs/05_roadmap_and_open_questions.md`、`docs/06_weekly_calendar_and_streak.md` |
| データ構造、保存、移行、バックアップ | `docs/04_data_design.md`、`docs/privacy-policy.md`、`README.md` のデータ保存 |
| 画面、HUD、ナビゲーション | `docs/01_project_overview.md`、`README.md` の画面、Nativeは `docs/07_react_native_plan.md` |
| 機能追加、優先度、MVP範囲 | `docs/03_feature_list.md`、`docs/05_roadmap_and_open_questions.md` |
| 報酬判定（キーワード評価）、タスク解析 | `docs/02_game_design.md`、`docs/04_data_design.md`、`docs/05_roadmap_and_open_questions.md` |
| キャラクター、3Dモデル、3D操作 | `docs/02_game_design.md`、`docs/characters/*.md`、Nativeは `docs/07_react_native_plan.md` |
| Native、モノレポ、ビルド、配布 | `docs/07_react_native_plan.md`、`README.md` のモノレポ・APK |
| プライバシー、外部送信、保存先 | `docs/privacy-policy.md`、`docs/04_data_design.md` |

仕様変更を含む作業では、完了報告に更新したドキュメントを明記する。

## 技術スタック
原則：
- TypeScript / React / Vite / React Router / Zustand
- Three.js / React Three Fiber / expo-gl
- Expo / React Native / Expo Router / AsyncStorage
- npm workspaces
- Vitest / Playwright
- 将来的にSupabase / PostgreSQL / Supabase Auth / RLS / Edge Functions

共有パッケージ：
- `@tasmate/core`：プラットフォーム非依存のゲームロジック・ストア・保存抽象
- `@tasmate/types`：共有型
- `@tasmate/design-tokens`：デザイントークン
- `@tasmate/task-evaluation`：キーワードによるタスク評価

実際の採用ライブラリとバージョンは `package.json` とロックファイルを確認する。技術選定を変更する場合は理由・利点・欠点・移行影響を説明する。

## ディレクトリ方針
Web版：
- `src/app/`：初期化、ルーティング、プロバイダー
- `src/features/`：機能単位の実装
- `src/components/ui/`：再利用UI
- `src/components/game/`：ゲーム共通UI（HUD、シェル、ナビゲーション）
- `src/game3d/`：Webの3Dシーン
- `src/data/`：Web側の初期データ・マスターデータの再エクスポート
- `src/domain/`：`@tasmate/core` の再エクスポート
- `src/services/`：保存・バックアップなどWeb専用アダプタ
- `src/stores/`：Web側の共有状態
- `src/hooks/`：再利用Hooks
- `src/lib/`：共通ユーティリティ
- `src/styles/`：グローバルスタイル
- `src/types/`：Web固有の型

Native版：
- `apps/mobile/app/`：Expo Routerのルート（tabs、設定、ライセンスなど）
- `apps/mobile/src/screens/`：画面
- `apps/mobile/src/components/`：HUD、シェル、実行時処理
- `apps/mobile/src/features/`：機能単位のUI
- `apps/mobile/src/game3d/`：expo-glによる3Dシーンとタッチ操作
- `apps/mobile/src/stores/`：AsyncStorageアダプタを含むストア
- `apps/mobile/src/services/`：共有・バックアップなどNative専用処理
- `apps/mobile/src/theme/`：`@tasmate/design-tokens` の再エクスポート
- `apps/mobile/src/ui/`：Native共通UI
- `apps/mobile/assets/`：Native用モデル・画像
- `apps/mobile/android/`：prebuild生成物。原則編集・コミットしない

ルート：
- `packages/`：共有パッケージ
- `tests/`：Web・共有ロジックのテスト
- `public/assets/`：Web用アセット

既存構成が異なる場合、すぐに全面移行せず現状に適した構成を優先する。

## アーキテクチャ・状態管理
- ゲームルールはUIコンポーネントに埋め込まず、可能な限り `packages/core/src/` に置く。Web固有の処理は `src/`、Native固有の処理は `apps/mobile/src/` に分離する。
- 共有パッケージにはDOM・React Native・`localStorage`・`AsyncStorage` を直接持ち込まない。
- UIから保存先・DB詳細へ直接依存させず、ストアのアクションとサービス層を経由する。
- 保存は `StorageAdapter` を介する。Webは `localStorage`（キー `tasmate:state:v1`）、NativeはAsyncStorageを使う。
- 永続データと一時的な画面状態を区別し、同じデータを重複管理しない。
- コンポーネント内だけの状態はReact State、複数画面で共有する状態はZustand（`createAppStore`）を利用する。
- 3Dシーンは通常UIやゲームの正規データから分離する。3D側の状態を正規データとして扱わない。
- タスク評価は `@tasmate/task-evaluation` のキーワード判定を正式な判定として使う。外部AIは使用しない。
- サーバーデータを導入する場合も、UIから取得・更新の詳細へ直接依存させない。

## コーディング規約
- TypeScriptの型安全性を優先し、`any` は原則使用しない。必要なら理由と範囲を限定する。
- 外部入力・APIレスポンス・保存データは必要に応じて実行時検証する。
- `@ts-ignore` などで型エラーを安易に回避しない。
- 既存の命名規則に合わせ、関数・コンポーネントに責務を詰め込みすぎない。
- 不要な依存ライブラリを追加しない。
- 色・余白・角丸・文字サイズ・影・モーションは `@tasmate/design-tokens` を使い、画面ごとに直値を増やさない。
- コメントは設計理由や注意点を説明する。コードの内容を復唱するだけのコメントを増やさない。
- 不要なデバッグ出力を残さない。
- エラー表示は利用者に理解できる内容とし、内部情報を不用意に公開しない。
- `dist/`、`coverage/`、`test-results/`、`apps/mobile/android/` などの生成物を手動編集しない。

## 安全な変更・コマンド実行
- `package.json` と既存スクリプトを確認し、用意されたコマンドを優先する。
- 不明なスクリプトや外部コードを内容確認なしに実行しない。
- ファイル削除、DBリセット、履歴の破壊的変更を避ける。
- `git reset --hard`、`git clean -fd`、強制プッシュなどは明示的な指示なしに実行しない。
- シークレット・認証情報・個人情報をログやコミットへ出力しない。
- 既存のユーザー変更を勝手に上書きしない。
- 問題解決に必要な最小限のコマンドを選ぶ。
- Nativeのネイティブ設定変更時は `npm run prebuild:android -w tasmate-mobile -- --clean` の影響（`apps/mobile/android/` の再生成）を理解してから実行する。

## 作業手順
1. 関連ドキュメントと既存コードを確認する。
2. 作業領域を特定し、「Skillsの利用」の表から必要なSkillを実装前に読み込む。
3. 目的・影響範囲・実装方針を整理し、「仕様変更時のドキュメント更新」で更新対象を確認する。
4. 必要なファイルと変更内容を特定する。
5. 小さな単位で実装する。
6. 変更範囲に応じた型チェックと関連テストを実行する。
7. 必要に応じて関連ドキュメントを更新する。
8. 変更内容・テスト結果・残課題を報告する。

単純で影響範囲の小さい修正では、過剰な計画を作らず直接実装してよい。

## 検証コマンド
利用可能性を確認し、変更範囲に応じて実行する。

Web・共有パッケージ：
- `npm run typecheck`：TypeScript型チェック
- `npm run lint`：ESLint
- `npm run test`：Vitest単体テスト
- `npm run e2e`：Playwright E2E（Web、Chromium）
- `npm run build`：型チェック + 本番ビルド
- `npm run licenses:generate`：依存関係を変更したとき

Native：
- `npm run typecheck -w tasmate-mobile`：Native型チェック
- `npm run doctor -w tasmate-mobile`：Expo設定・依存関係の確認
- `npm run export:android -w tasmate-mobile` / `npm run export:ios -w tasmate-mobile`：書き出し確認
- `npm run apk:release -w tasmate-mobile`：WindowsでのAPKビルド（手順はREADME参照）

注意：
- `npm run lint` と `npm run test` の対象は `src/`、`tests/`、`packages/` であり、`apps/mobile/` は含まれない。
- Nativeには現時点で単体テストの実行環境がない。型チェック・Expo Doctor・実機またはExpo Goでの確認を行う。
- PlaywrightはWebのChromiumのみを対象とする。
- 実行していない検証を成功したと報告しない。

## 完了報告
- 実装・修正した内容
- 主な変更ファイル
- 使用したSkill
- 更新したドキュメント
- 実行した検証と結果
- 未実装項目・既知の問題
- ユーザー側で必要な操作

未実装・未検証・仮実装を明確に区別する。

## Skillsの利用
特定領域の作業では、実装前に該当するSkillを `skill` ツールで読み込む。読み込んだだけでは変更せず、Skillの手順と本ファイルの全体方針を照らし合わせてから作業する。

| 作業領域 | 最初に読むSkill | 必要に応じて追加 |
| --- | --- | --- |
| Expo・Native全般 | `expo-overview` | `expo-router`、`expo-native-ui`、`expo-design-system` |
| Expo Routerのルート、タブ、モーダル、ヘッダー | `expo-router` | `expo-overview` |
| Native画面の見た目、HIG、Safe Area、タッチ操作 | `expo-native-ui` | `expo-design-system` |
| デザイントークン、共通UI、画面の一貫性 | `expo-design-system` | `game-ui-design` |
| Web/Nativeのゲーム画面・HUD | `game-ui-design` | `expo-native-ui`（Native）、`frontend-design` |
| 新しいUIのビジュアル方向性・タイポグラフィ | `frontend-design` | `game-ui-design` |
| 新しい外部ライブラリ・サービスの導入 | `expo-examples` | `expo-overview` |
| Expo SDKの更新・依存関係の互換性 | `expo-upgrade` | `expo-overview` |
| App Store / Google Play / TestFlightへの提出 | `eas-app-stores` | — |
| EASクラウドSimulatorでの実行・確認 | `eas-simulator` | — |
| 報酬、経済、育成、施設、結晶合成、探索 | `game-domain` | `data-security` |
| タスク、タイマー、作業履歴、中断・再開 | `task-timer` | `game-domain` |
| 3Dシーン、モデル、カメラ、3D操作 | `threejs-development` | `expo-overview`（Native） |
| 保存、バックアップ、認証、Supabase、RLS | `data-security` | `game-domain` |
| 型チェック、テスト、ビルド、回帰確認 | `testing-quality` | — |

ルール：
- Native/Expoの作業では、個別Skillより先に `expo-overview` を読む。
- 複数領域にまたがる場合は、必要なSkillを複数読み込む。
- 無関係なSkillを習慣的に読み込まない。
- Skillと本ファイル・既存仕様が矛盾する場合は、本ファイルの全体方針と既存仕様を優先し、矛盾を報告する。
- 作業完了時に、使用したSkillと、Skillの指示に従わなかった箇所があればその理由を報告する。
