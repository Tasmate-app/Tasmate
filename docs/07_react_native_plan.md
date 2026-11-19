# React Native版追加・モノレポ化 調査報告

- 調査日: 2026-10-30
- 状態: 調査完了・実装進行中（現在のタブ構成は第13節を参照）
- 対象: 既存Tasmate Web版の維持と、React Native + ExpoによるAndroid/iOSアプリ版の追加

本ドキュメントは調査結果と移行計画をまとめたものである。現在の実装状況の詳細は第13節を参照。

## 1. 結論

- 既存Web版は **型チェック・単体テスト・本番ビルドが成功**。ゲームロジックは `src/domain/` に純粋関数として分離されており、共通化の土台は良好である。
- 最大のブロッカーは次の3点。
  1. **React 18 → React 19 / R3F 8 → R3F 9 のアップグレード**（Web版とExpo版で3Dを揃えるため）
  2. **localStorage依存の同期ストア**（React NativeはAsyncStorageで非同期。起動時ハイドレーションの再設計が必要）
  3. **Web専用UI・ブラウザAPI・3Dのプラットフォーム依存部分**の分離
- 現在の3Dは比較的移植しやすい構成である。利用しているDreiは `OrbitControls` のみ、LunaのGLBは**外部テクスチャなし・アニメーションなし・DRACOなしの自己完結GLB（約454KB）**でした。ただし `OrbitControls` はNativeで既知の問題があるため、初期検証では固定カメラまたは独自タッチ操作を推奨する。
- APIクライアント層は**まだ存在しない**。`packages/api` はSupabase/AI接続のフェーズまで作らない方が安全である。

## 2. 既存Web版のベースライン確認

実行環境: Node `v22.23.4` / npm `10.9.9`

| 項目 | 結果 |
|---|---|
| `npm run typecheck` | 成功 |
| `npm test` | **11ファイル / 86テストすべて成功** |
| `npm run build` | 成功 |
| ビルドサイズ | JS 1,201.53 kB（gzip 337.62 kB）、500kB超の警告あり |
| `npm run lint` | **失敗（コード起因ではない）**。`node_modules` に `eslint-plugin-react-hooks` / `eslint-plugin-react-refresh` が存在しない。`package-lock.json` には記載あり |
| `npm run e2e` | 未実行。Playwrightブラウザ未インストール（`%LOCALAPPDATA%\ms-playwright` なし） |

補足: 実際にインストールされている主要バージョンは `@react-three/fiber@8.18.0`、`@react-three/drei@9.122.0`、`three@0.170.0`、`zustand@5.0.15`、`react@18.3.1` である（`package.json` の範囲内）。

## 3. 現在のソース構成

```
src/
  main.tsx, vite-env.d.ts
  app/            App.tsx, router.tsx
  components/
    game/         GameShell, GameHUD, GameNavigation, SupportEventLayer
    ui/           Button, Card, Badge, Field, GameIcon
  data/           seed.ts（キャラ・探索先・施設定義）
  domain/         純粋ロジック（8ファイル）
  features/       calendar, companions, facilities, home, house,
                  rest, shop, sortie, storage, tasks
  game3d/         RoomScene.tsx
  hooks/          useNow.ts, useWeeklyEvaluation.ts
  services/       appState.ts, rewardService.ts, storage.ts
  stores/         appStore.ts（891行）
  styles/         global.css, tokens.css
  types/          index.ts（258行）
tests/            11ファイル + e2e/smoke.spec.ts
public/assets/    Luna GLB、ベースキャラクター素材
```

規模は `src` 61ファイル、約326KBである。機能数に対してストアが大きく、共通化の中心になる。

## 4. 共通化可能な範囲

### 4.1 そのまま共通化しやすい

| 対象 | ファイル | 備考 |
|---|---|---|
| 型定義 | `src/types/index.ts` | 依存なし。`packages/types` へ移動可能 |
| ゲームバランス定数 | `src/domain/constants.ts` | 純粋 |
| 報酬計算 | `src/domain/reward.ts` | 純粋 |
| 素材収集 | `src/domain/collection.ts` | 純粋 |
| 施設生産・強化 | `src/domain/facility.ts` | 純粋 |
| 休憩・応援判定 | `src/domain/rest.ts` | 純粋 |
| タイマー計算 | `src/domain/session.ts` | 純粋。localStorageの記述はコメントのみ |
| 週間判定・継続倍率 | `src/domain/weekly.ts` | 純粋。ローカル日付計算 |
| 繰り返し予定 | `src/domain/recurrence.ts` | 純粋 |
| マスタデータ | `src/data/seed.ts` | 純粋。GLBパスはプラットフォーム側で解決 |
| 状態の検証・正規化 | `src/services/appState.ts` | `Date` のみ依存。純粋に近い |
| 報酬サービス | `src/services/rewardService.ts` | 現状はローカル計算。AI未接続 |

`src/domain` 配下はReact・DOM・ブラウザAPIに依存していないため、**`packages/core` の最初の移行対象**として最適である。

### 4.2 分離・抽象化が必要

| 対象 | 現状 | 方針 |
|---|---|---|
| Zustandストア | `src/stores/appStore.ts` | ドメインロジックは共有可能。ただしストレージを注入するファクトリ化が必要 |
| 永続化 | `src/services/storage.ts` | `localStorage` 直依存。Web/Nativeアダプタに分割 |
| React Router | `src/app/router.tsx` | Web専用。Expo Routerで別実装 |
| UIコンポーネント | `components/`, `features/` | CSS・DOM前提。React Nativeでは再実装 |
| 画面遷移の状態 | `location.state` | Expo Routerのクエリパラメータ/ストアに置換 |
| 3D | `src/game3d/RoomScene.tsx` | シーン内容は参考にできるが、Canvas・GLB読込・操作系はプラットフォーム分割 |
| デザイントークン | `packages/design-tokens/`（`@tasmate/design-tokens`） | 色・余白・角丸・影・モーションをTSで共有。Webは起動時にCSS変数へ適用し、RNはそのまま参照する |
| API | 未実装 | Supabase/AI接続時に `packages/api` を新設 |

## 5. Zustandストアの依存関係

### 5.1 構造

`src/stores/appStore.ts` は単一ストアで、以下を持つ。

- 状態: `tasks`, `activeSession`, `sessionHistory`, `inventory`, `characters`, `facilities`, `rewards`, `appliedRewardSessionIds`, `recurrenceRules`, `weeklyEvaluations`, `weeklyProgress`, `restWeeks`, `restSession`, `supportEvents`
- アクション: タスクCRUD、繰り返しルールCRUD、セッション開始/一時停止/再開/終了、休憩、応援イベント、レベルアップ、施設強化/稼働、週次判定、休息週、リセット

### 5.2 依存関係

```
appStore
  ├─ domain/session, reward, facility, weekly, recurrence, constants, rest
  ├─ services/appState（状態型・初期値・正規化）
  ├─ services/storage（localStorage）
  ├─ services/rewardService
  ├─ data/seed（キャラ名・応援キャラ選択）
  └─ types
```

主な利用画面:

| 状態・アクション | 利用箇所 |
|---|---|
| `inventory`, `activeSession`, `restSession` | `GameHUD`, `HomePage`, `Sortie`, `RestPrompt` |
| `tasks`, `characters`, `facilities` | `Sortie`, `Calendar`, `HomePage`, 3Dシーン |
| `rewards` | `SortieResult`, `RestPrompt`, `RewardHistory` |
| `weeklyProgress`, `weeklyEvaluations`, `restWeeks` | `WeeklyProgressPanel`, `WeeklyCalendarPage` |
| `levelUpCharacter` | `CompanionsPage`, `CharacterPanel` |
| `upgradeFacility`, `toggleFacility` | `FacilitiesPage`, `ShopPage`, `FacilityPanel` |

### 5.3 共通化上の問題

1. **モジュール読込時に同期で保存データを読む**
   - `src/stores/appStore.ts:318` で `loadAppState()` を即時実行。
   - React NativeのAsyncStorageは非同期のため、この構造はそのまま使えない。

2. **状態変更のたびに同期保存**
   - `src/stores/appStore.ts:872-891` の `subscribe` → `saveAppState()`。
   - Nativeでは保存キュー・デバウンス・直列化が必要。ハイドレーション前に保存すると、保存済みデータを初期値で上書きする危険がある。

3. **ID生成が `crypto.randomUUID` 依存**
   - `src/stores/appStore.ts:51-56`。Hermes環境によっては利用不可。フォールバックはあるが、`expo-crypto` などへの注入を検討。

4. **テストが `window.localStorage` 前提**
   - `tests/sessionStore.test.ts`, `tests/weeklyStore.test.ts` などが `window.localStorage.clear()` とストア直接importを使用。
   - ストアファクトリ化後は、インメモリストレージを注入できるようにする必要がある。

5. **ストアが単一で大きい**
   - 画面間の状態共有には便利だが、永続化・ID生成・時刻取得が混在。共有化の前にポート化すると安全。

## 6. ブラウザ依存箇所

| 箇所 | 内容 | Nativeでの対応 |
|---|---|---|
| `src/services/storage.ts:18,28,36-37,47,55-56` | `window.localStorage` | AsyncStorageアダプタ |
| `src/game3d/RoomScene.tsx:2-5` | Web版 `Canvas`, `OrbitControls`, `GLTFLoader` | `/native` 版Canvas、独自ローダー、操作系 |
| `src/game3d/RoomScene.tsx:21` | `import.meta.env.BASE_URL` | アセット解決関数をプラットフォーム分割 |
| `src/game3d/RoomScene.tsx:136,139,222,225` | `document.body.style.cursor` | Web専用。Nativeでは削除/ガード |
| `src/hooks/useWeeklyEvaluation.ts:19-25` | `document.visibilityState`, `window.setInterval` | `AppState` API + `setInterval` |
| `src/hooks/useNow.ts:13-14` | `window.setInterval` | `globalThis.setInterval` へ変更可能 |
| `src/features/calendar/WeeklyCalendarPage.tsx:100-101` | `window.setInterval` | 同上 |
| `src/features/calendar/CalendarTaskModal.tsx:77-78` | `window.addEventListener('keydown')` | Nativeではキーボードイベントなし |
| `src/features/calendar/RecurrenceRuleModal.tsx:52-53` | 同上 | 同上 |
| `src/features/sortie/QuestCreateModal.tsx:26-27` | 同上 | 同上 |
| `src/components/ErrorBoundary.tsx:30` | `window.location.reload()` | `Updates.reloadAsync` など、または再試行UI |
| `src/main.tsx:8` | `document.getElementById` | Expoのエントリポイント |
| `src/app/router.tsx:1` | `createBrowserRouter` | Expo Router |
| `src/stores/appStore.ts:52` | `crypto.randomUUID` | フォールバックまたは `expo-crypto` |
| `src/features/tasks/TimerPanel.tsx:153` など | `toLocaleTimeString('ja-JP')` | HermesのIntl対応を確認 |
| 全体 | CSS、aria、DOMイベント | React NativeのStyleSheet・accessibilityへ再実装 |

特に `src/features/home/HomePage.tsx:112,121,154,163` は `navigate(..., { state: { selectedId } })` を使い、`CompanionsPage` / `FacilitiesPage` が `useLocation()` で受け取っている。Expo Routerでは `?selectedId=...` などのパラメータ設計に変更が必要である。

## 7. 3D関連のNative対応状況

### 7.1 現在の利用状況

- `@react-three/fiber`: `Canvas`, `useFrame`, `ThreeEvent`
- `@react-three/drei`: `OrbitControls` のみ
- `three`: ジオメトリ、マテリアル、`Box3`、`Texture`、`GLTFLoader`
- GLB: `src/data/seed.ts:26` の `/assets/characters/luna/luna.glb`
- 独自読込: `RoomScene.tsx:53` の `new GLTFLoader().load(...)`
- アニメーション: キャラの上下動、施設ランプの点滅（`useFrame`）
- カメラ: `OrbitControls` + 固定初期カメラ
- 操作: クリック、ホバー、背景クリック

### 7.2 Luna GLBの実体確認

`public/assets/characters/luna/luna.glb` を解析した結果:

- 外部画像URIなし。PNGテクスチャをGLB内に内包
- テクスチャ1枚、マテリアル1個
- アニメーションなし
- DRACO/Meshoptなどの圧縮拡張なし
- 約454KB（自己完結）

したがって、**テクスチャの外部パス解決やDracoデコーダは現時点で不要**である。GLB自体のNative読み込み難易度は低めである。

### 7.3 Native対応の評価

| 項目 | 評価 | 対応方針 |
|---|---|---|
| `Canvas` | Native版あり | `@react-three/fiber/native` のCanvasへ差し替え |
| `useFrame` / ジオメトリ / マテリアル | 対応 | そのまま利用可能 |
| `primitive` によるGLB表示 | 対応 | 読み込み方法のみ変更 |
| GLB読込 | 要変更 | MetroのassetExtsに`glb`追加。`useGLTF`（`@react-three/drei/native`）または`Asset.fromModule` + loader |
| テクスチャ | 今回は内包 | 追加テクスチャを使う場合はMetro設定とURI解決を検証 |
| カメラ操作 | 実装済み | 独自タッチ操作で1本指回転・ピンチズームを実装。`OrbitControls` はNativeのマルチタッチ問題を避けるため未使用 |
| タッチ操作 | 実装済み | R3F Nativeのpointerイベントを購読し、1本指回転・ピンチズームを独自実装 |
| ホバー | 非対応 | `onPointerOver/Out` とカーソル処理をWeb専用化。タップ選択に変更 |
| アニメーション | 対応 | 現在の`useFrame`は問題なし |
| `onPointerMissed` | 要検証 | Native Canvasでの挙動を実機確認 |
| Drei全般 | 一部のみ | `/native` でも `Html`, `Loader` などは未対応。使用機能を限定 |
| パフォーマンス | 問題になりにくい | シーンは軽量。ただし常時`useFrame`のため、アイドル時は`frameloop="demand"`も検討 |
| iOSシミュレータ | 非推奨 | OpenGL ESの不具合でクラッシュ例あり。実機テスト必須 |
| Expo Go / Dev Build | 要確認 | `expo-gl` を含むため開発ビルドを推奨 |

### 7.4 推奨する3D方針

Web版の `RoomScene.tsx` を無理に共通化せず、次のように分離するのが安全である。

- 共有: キャラ・施設の配置座標、色、表示定数、モデルメタデータ
- Web: 既存 `RoomScene.tsx` を維持
- Native: `RoomScene.native.tsx` を新規実装
  - `Canvas` は `@react-three/fiber/native`
  - カメラ操作は独自タッチ操作（1本指回転・ピンチズーム）
  - GLBは `useGLTF` + Metroアセット
  - 選択はタップ、ホバーなし

LunaのGLB表示・タップ選択・カメラ操作・フレームレートは実機で確認する。

## 8. 推奨バージョンと互換性

### 8.1 重要な制約

- `@react-three/fiber` 9.8.2 のpeer dependencyは **React `>=19 <19.4`、React Native `>=0.78`、three `>=0.156`**。
- `@react-three/drei` 10.7.9 は **React `^19`、R3F `^9`、three `>=0.159`**。
- Expo SDK 58 は **React Native 0.88 / React 19.3.0**。
- したがって、**Web版をReact 18のままにして、最新のExpo + R3F 9で3Dを共通化することはできません**。
- React 18を維持する場合はR3F 8 + 旧Expo SDK（React 18世代）になるが、2026年時点では保守性・Expo Go対応の面で不利である。

### 8.2 推奨構成

| パッケージ | Web | Mobile | 備考 |
|---|---|---|---|
| `react` | 19.3.0 | 19.3.0 | Expo SDK 58に合わせて固定 |
| `react-dom` | 19.3.0 | - | Webのみ |
| `@types/react` | 19.3.0 | 19.3.0 | 同上 |
| `@react-three/fiber` | 9.8.2 | 9.8.2 | Mobileは `/native` からimport |
| `@react-three/drei` | 10.7.9 | 10.7.9 | Mobileは `/native`。使用機能を限定 |
| `three` | 0.170.0 | 0.170.0 | まず現行版を維持。余裕があれば0.187.0へ |
| `zustand` | 5.0.16 | 5.0.16 | React 19対応 |
| `react-router-dom` | 6.28.0 | - | 今回はv7へ上げない |
| `vite` | 6.x | - | 現行維持 |
| `vitest` | 3.x | - | 共有ロジック・Web用 |
| `expo` | - | 58.0.21 | SDK 58 |
| `react-native` | - | 0.88.1 | Expo管理 |
| `expo-router` | - | 58.0.28 | |
| `expo-gl` | - | 58.0.3 | R3F Nativeに必要 |
| `expo-asset` / `expo-file-system` | - | SDK 58対応版 | `npx expo install` で導入 |
| `expo-crypto` | - | SDK 58対応版 | ID生成が必要なら |
| `@react-native-async-storage/async-storage` | - | Expo互換版 | `npx expo install` |
| `react-native-gesture-handler` | - | Expo互換版 | 独自3D操作に使用 |
| `react-native-safe-area-context` / `react-native-screens` | - | Expo互換版 | Expo Router必須 |
| `@testing-library/react-native` | - | 14.x | Mobileコンポーネントテスト |
| `jest-expo` / `jest` | - | 58.x / 30.x | Mobileテスト |
| Maestro | - | 最新CLI | Mobile E2E |

補足:

- Expo管理パッケージはバージョンを手書きせず、**`npx expo install`** でSDK互換版を入れるのが原則である。
- Nodeは **22.13以上** が必要である（Expo SDK 58）。現在のREADMEの「Node 20以上」はMobile追加時に更新が必要である。
- SDK 58が新しく、Expo Goの配布状況やRN 0.88の不具合が気になる場合は、**SDK 57（RN 0.86 / React 19.2.3）** で開始する選択肢もある。R3F 9.8.2のpeer範囲には収まる。
- `expo-three` は不要である。R3F Native + `expo-gl` で進められる。
- E2EはWebのPlaywrightを維持し、MobileはMaestroを推奨する。MobileのコンポーネントテストはVitestではなくJest + React Native Testing Libraryが現実的である（Expo/RNの公式プリセットがJest前提のため）。

## 9. モノレポ化の具体的な手順

### 9.1 目標構成

```
/
  package.json                  # workspaces（当面はWebアプリも兼ねる）
  packages/
    types/                      # 共通型
    core/                       # domain, data, state, reward logic
    api/                        # 将来のSupabase/AI通信
  apps/
    mobile/                     # Expoアプリ
  src/                          # 既存Web版（当面は移動しない）
  public/
  tests/
```

最終的にWebを `apps/web/` へ移すことも可能だが、**最初のフェーズでは `src/` を動かさない**方針を推奨する。

### 9.2 手順

1. **Web版を先にReact 19 / R3F 9へアップグレードする**
   - 別PRで実施。
   - `react`, `react-dom`, `@types/react`, `@types/react-dom` を19.3.0へ。
   - `@react-three/fiber@9.8.2`, `@react-three/drei@10.7.9` へ。
   - `three@0.170.0` は維持。
   - `npm run typecheck`, `npm test`, `npm run build`, `npm run e2e` を確認。
   - 3Dホーム画面の表示・操作を手動確認。

2. **ルートにnpm workspacesを追加**
   - `package.json` に `"workspaces": ["apps/*", "packages/*"]`。
   - React/Threeの重複を防ぐため `overrides` を設定。
   - `package-lock.json` はルート1本に統一。
   - `npm ls react react-dom three` で重複確認。

3. **`packages/types` を作成**
   - `src/types/index.ts` の内容を移動。
   - `package.json` の `exports` / `types` をソースTSへ向ける。
   - Web側は一旦 `src/types/index.ts` を再エクスポートのシムにして、既存importを壊さない。

4. **`packages/core` を作成**
   - `src/domain/*`、`src/data/seed.ts`、`src/services/appState.ts`、`src/services/rewardService.ts` を移動。
   - Web側の各ファイルは再エクスポートのシムにする。
   - `tests/` は既存のまま動くことを確認。
   - `vitest.config.ts` のcoverage対象を `packages/core` に更新。

5. **Expoアプリを追加**
   ```powershell
   npx create-expo-app@latest apps/mobile --template default@sdk-58
   ```
   - `apps/mobile/metro.config.js` に `watchFolders`、`nodeModulesPaths`、`assetExts`（`glb`, `gltf`, `png`, `jpg`）を設定。
   - `apps/mobile/tsconfig.json` は `expo/tsconfig.base` を継承し、`@tasmate/core` / `@tasmate/types` を参照。
   - ルートの `tsconfig` は `packages` と `apps/mobile` を考慮した構成に分割。

6. **ストレージ抽象化**
   - `AppStateStorage` インターフェースを `packages/core` に定義。
   - Web: localStorageアダプタ。
   - Mobile: AsyncStorageアダプタ。
   - ストアを `createAppStore({ storage, idFactory })` のファクトリに変更。
   - `hydrate()` を追加し、ハイドレーション完了まで保存を禁止。
   - 保存はデバウンス＋直列キュー。アプリのバックグラウンド移行時にflush。

7. **モバイルUIを実装**
   - Expo Routerの画面構成を作成。
   - タスク、タイマー、出撃、カレンダー、仲間、施設、ショップ、倉庫をRNで再実装。
   - 3Dは別実装。共有ストアとドメインロジックを利用。

8. **API層は後回し**
   - Supabase/AI接続時に `packages/api` を新設。
   - 現在の `rewardService.ts` はローカル計算のまま維持。

### 9.3 npm workspaces利用時の注意

- Expoはモノレポに対応しているが、Metroの `watchFolders` と `nodeModulesPaths` の設定が必要である。
- Reactが複数バージョンになるとフックエラーやR3Fの不具合につながるため、**Reactは1バージョンに固定**する。
- `three` も可能な限り1バージョンに統一する。
- `package.json` の `exports` でTSソースを直接公開する方式は、Vite/Vitest/Metroで動くが、Metroで解決できない場合は `main` / `react-native` フィールドも併記する。
- `.gitignore` に `.expo/`、`apps/mobile/android/`、`apps/mobile/ios/`（生成物）などを追加する。

## 10. 段階的な実装計画

### Phase A: Web互換性アップグレード（最優先）

- React 19 / R3F 9 / Drei 10へ更新。
- 既存86テスト、型チェック、ビルド、Web E2Eを維持。
- 3Dホームの表示・クリック・カメラ操作を確認。
- **ここが失敗するとモバイル3Dの前提が崩れるため、最初に完了させる。**

### Phase B: Expo 3D検証（小規模PoC）

- `apps/mobile` に固定カメラのR3F Nativeシーンを作成。
- 立方体 → Luna GLBの順で表示確認。
- 実機（Android/iOS）でタップ選択、フレームレート、メモリ、GLB読込を確認。
- `OrbitControls` は使わず、必要なら独自タッチ操作を追加。
- Go/No-Go判断:
  - GLBが表示できる
  - タップ選択が動く
  - 実用フレームレート
  - クラッシュしない

### Phase C: 共通パッケージ抽出

- `packages/types`、`packages/core` を作成。
- Web側は再エクスポートで互換維持。
- 既存テストが無変更で通ることを確認。
- ここではUI・ストアの大規模変更はしない。

### Phase D: ストレージ・ストア共通化

- ストレージポートとストアファクトリを導入。
- Web: localStorageアダプタ。
- Mobile: AsyncStorageアダプタ。
- ハイドレーション、保存キュー、バックグラウンドflushを実装。
- Webのリロード復元、タイマー復元、二重報酬防止を再テスト。
- Mobile用のインメモリストレージテストを追加。

### Phase E: モバイル基本UI

- Expo Routerで画面遷移を構築。
- タスク作成、タイマー、出撃、報酬、仲間、施設、カレンダーを実装。
- Webの `location.state` 依存をパラメータ/ストアに置換。
- 通知は別フェーズ（expo-notifications）。

### Phase F: モバイル3D統合

- Native用 `RoomScene.native.tsx` を実装。
- 共有ストアからキャラ・施設状態を取得。
- タッチ操作、選択、背景タップを実装。
- パフォーマンス計測後、必要なら `frameloop` やDPRを調整。

### Phase G: API・同期

- `packages/api` を新設。
- Supabase Auth / RLS / Edge Functionsを検討。
- ローカル保存とクラウド同期の競合解決を設計。
- AI報酬はサーバー側検証を前提にする。

## 11. 移行で発生しそうな問題

| リスク | 内容 | 対策 |
|---|---|---|
| React 19アップグレード | R3F 9 / Drei 10のAPI差分、イベント型、テスト環境 | Web単体で先に検証。3Dは手動確認も実施 |
| ストアの非同期化 | 起動直後に初期状態で上書き、保存競合、データ消失 | ハイドレーション完了フラグ、保存キュー、デバウンス |
| データ移行 | WebのlocalStorageデータをMobileへ移せない | エクスポート/インポート、またはSupabase同期を設計 |
| 3Dカメラ操作 | `OrbitControls` のNative不具合、マルチタッチ | 初期は固定カメラ。独自ジェスチャー実装 |
| GLB/アセット解決 | `import.meta.env.BASE_URL`、MetroのassetExts、`/assets` パス | プラットフォーム別のアセット解決関数、Metro設定 |
| iOS実機依存 | シミュレータでGLが不安定、WindowsではiOSビルド不可 | 実機 + EAS Build。Android優先で検証 |
| Expo Go vs Dev Build | `expo-gl` やネイティブモジュールの制約 | 開発ビルドを用意 |
| モノレポの依存重複 | React/Threeが複数バージョンになりフックエラー | `overrides`、`npm ls`、単一ロックファイル |
| UI再実装コスト | WebのCSS・aria・レスポンシブをそのまま使えない | RNコンポーネントを別設計。共通はロジックのみ |
| 画面遷移 | `location.state` がExpo Routerにない | クエリパラメータ/ストアへ置換 |
| ブラウザAPI | `document`, `window`, `crypto`, `Intl` | プラットフォーム別フック・アダプタ |
| テスト基盤 | VitestはRNコンポーネントに不向き | 共有ロジックはVitest、MobileはJest + RNTL、E2EはMaestro |
| Lint環境 | 現在 `node_modules` にESLintプラグインがない | Mobile追加前に `npm ci` で環境を揃える |
| バンドルサイズ | Three/DreiでWeb 1.2MB、Mobileも増加 | 3Dの遅延読込、Dreiの使用機能限定 |
| API未設計 | 現状はローカル報酬のみ | `packages/api` はSupabaseフェーズまで作らない |
| ドキュメント不整合 | READMEのNode 20要件、Mobile未記載 | 実装フェーズでREADME/docsを更新 |

## 12. 実装開始前の確認事項

以下を決めれば、Phase Aから着手できる。

1. **Web版を先にReact 19 / R3F 9へアップグレードしてよいか**（推奨）
2. **Expo SDK 58で開始するか、安定重視でSDK 57にするか**
3. **Mobileの永続化はAsyncStorageで開始するか**（MVPでは推奨）
4. **Mobile E2EはMaestroでよいか**
5. **Webディレクトリは当面 `src/` のまま維持し、`apps/mobile` と `packages/*` のみ追加する方針でよいか**

この節は調査当時の着手条件である。現在のタブ構成と実装状況は第13節を参照。

## 13. 現在のタブ構成（2026-11-18）

Web / Native とも次の9タブで統一する。

- ホーム（Native ID: `home`、Web: `/`）
- 履歴（`/history`）
- 計画（`/plan`）
- 拠点（`/base`）
- キャラクター（`/character`）
- 施設（`/facilities`）
- かばん（`/inventory`）
- ショップ（`/shop`）
- 合成（`/synthesis`）

補足:

- ホームは固定表示とし、並べ替え・非表示の対象外。
- 表示項目・並び順はWeb / Nativeで共通の設定（`settings.navigationItems`）を使う。
- Webは768px未満でHUDのメニューボタンから開く左ドロワー、768px以上で常設サイドバーを表示する。Nativeは幅768px以上で常設サイドバー、それ未満ではHUDのメニューからドロワーを開く。常設時はサイドバーが全高、HUDは本文側の上に置き、HUDのブランド表示はサイドバーと重複させない。
- 画面本文はWebで最大1200px、Nativeではタブレット幅でも1カラム最大720pxで中央寄せする。左右余白は16px、狭い画面では12pxを基準にする。
- 旧保存値 `sortie` は `home` として読み替える。
- 分類管理はタブに含めず、履歴画面から `/categories` を開く。
- Webの旧URL（`/sortie`, `/calendar`, `/companions`, `/storage`, `/house`）は正規URLへリダイレクトする。
- 拠点は3D・住人・施設概要の閲覧に限定し、施設の強化・稼働切替は施設タブへ移す。
