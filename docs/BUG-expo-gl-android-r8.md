# Expo GL Android Release Crash 調査結果

## 調査概要

- 対象: `apps/mobile`（Tasmate）
- 調査日: 2026-11-05
- 事象: EAS Build の Android APK で拠点タブ（3Dルーム）を開くとクラッシュする。Expo Go では動作する。
- 調査方法: ソースコード・依存パッケージ・npm 配布物・EAS/Expo 設定の静的確認、GLB のバンドル確認、GitHub Issue / PR の確認
- コード修正: 暫定対応を実施（2026-11-06）

## 結論

原因は **`expo-gl` 58.0.4 に Android R8 用の keep ルールが含まれていないこと**。

Expo SDK 58 の managed build では release ビルドで R8 が有効（`android.enableMinifyInReleaseBuilds=true`）になる。`GLView` は `TextureView` を継承しており、`expo-modules-core` の `ExpoView` 向け keep ルールの対象外。そのため R8 がリフレクション用コンストラクタを削除・改名し、`GLView` 生成時に以下のクラッシュが発生する。

```
java.lang.IllegalStateException: Didn't find a correct constructor for class ...
```

続いて native 側から `GLContext.flush()` を JNI で呼び出そうとして `JNI DETECTED ERROR` に至る。

拠点タブを開いた際に `Canvas` がマウントされ、内部で `GLView` が生成されるため、この時点でクラッシュする。

## 根拠

### 1. `expo-gl` に keep ルールがない

- `node_modules/expo-gl/android/build.gradle:28` の `defaultConfig` に `consumerProguardFiles` がない。
- `node_modules/expo-gl/android/proguard-rules.pro` が存在しない。
- npm 配布物 `expo-gl@58.0.4` を確認:
  - tarball に `android/proguard-rules.pro` が含まれない。
  - 同梱 AAR に `proguard.txt` が含まれない。
  - CHANGELOG に今回の修正が含まれない。

### 2. `GLView` が keep 対象から漏れる

```kotlin
// node_modules/expo-gl/android/src/main/java/expo/modules/gl/GLView.kt:20
class GLView(context: Context, appContext: AppContext) : TextureView(context), SurfaceTextureListener {
```

`expo-modules-core` の keep ルールは `ExpoView` 派生クラスを対象とするが、`GLView` は `TextureView` 派生のため一致しない。Expo はビューをリフレクションで生成するため、コンストラクタ削除が直接クラッシュにつながる。

### 3. クラッシュ経路

- `apps/mobile/src/screens/BaseScreen.tsx:127` で `RoomScene` を描画。
- `apps/mobile/src/game3d/RoomScene.tsx:82` で `Canvas` を描画。
- `Canvas` のマウント時に `expo-gl` の `GLView` が生成される。

### 4. GLB はバンドルされている

`npx expo export --platform android` で `assets/luna.glb` がバンドルされることを確認済み。3Dモデルの削除やアセット経路の変更は不要。

### 5. Expo Go で動作する理由

Expo Go は R8 で縮小されていないビルド済みネイティブバイナリを使用するため。release APK のみで再現する差分と一致する。

## 修正状況

- 修正 PR: [expo/expo#51951](https://github.com/expo/expo/pull/51951)
  - タイトル: `[android][expo-gl] Keep GLView constructor and GLContext.flush in R8 release builds`
  - 2026-10-29 にマージ済み
  - changeset は `expo-gl: patch`
- 関連 Issue: [expo/expo#51948](https://github.com/expo/expo/issues/51948)
  - R8 有効: クラッシュ
  - R8 無効: 正常
  - `-keep class expo.modules.gl.** { *; }`: 正常
- 2026-11-05 時点で npm の最新版は `expo-gl@58.0.4`（2026-10-31 公開）だが、**修正は未収録**。
- 次の patch リリース（58.0.5 以降）に修正が含まれる見込み。

## 推奨対応

### 恒久対応

`expo-gl` の修正版（58.0.5 以降）へ更新し、APK を再ビルドする。

### 暫定対応

いずれかを release ビルドへ適用する。

1. ProGuard ルールを追加する（影響範囲が最小）

   `expo-build-properties` の `android.extraProguardRules` に、修正 PR 相当の keep ルールを追加する。

   ```
   -keepclassmembers class expo.modules.gl.GLView {
     public <init>(android.content.Context, expo.modules.kotlin.AppContext);
   }

   -keepclassmembers class expo.modules.gl.GLContext {
     public void flush();
   }
   ```

   もしくは、Issue で確認済みの広めのルールを使用する。

   ```
   -keep class expo.modules.gl.** { *; }
   ```

2. release の minify を無効化する

   `expo-build-properties` の `android.enableMinifyInReleaseBuilds` を `false` にする。

   注意: 難読化・縮小が無効になり APK サイズが増えるため、あくまで暫定策とする。

補足: `expo-build-properties` は現在の依存に含まれていないため、採用には依存追加の判断が必要。

## 実施した暫定対応

`expo-gl` の修正版が未公開のため、ProGuard ルールを追加した。

- `apps/mobile/package.json` に `expo-build-properties`（`~58.0.12`、Expo SDK 58 対応版）を追加。
- `apps/mobile/app.json` の `plugins` に `expo-build-properties` を追加し、`android.extraProguardRules` に修正 PR 相当の keep ルールを設定。

```text
-keepclassmembers class expo.modules.gl.GLView {
  public <init>(android.content.Context, expo.modules.kotlin.AppContext);
}

-keepclassmembers class expo.modules.gl.GLContext {
  public void flush();
}
```

release ビルドで `prebuild` 時に `android/app/proguard-rules.pro` へ追記される。

恒久対応として、`expo-gl` 58.0.5 以降が公開されたら `expo-gl` を更新し、上記の `extraProguardRules` と `expo-build-properties` 依存を削除する。

## 実機ログによる最終確認

以下が出力されれば、R8 によるコンストラクタ削除が確定する。

- `IllegalStateException: Didn't find a correct constructor for class ...`
- `JNI DETECTED ERROR ... GLContext.flush`

取得例:

```powershell
adb logcat -b crash
adb logcat | findstr /i "AndroidRuntime expo.modules.gl GLView FATAL JNI"
```

上記が出ない場合は、GLB の埋め込みアセット解決や JS 側エラーを次に確認する。

## 変更ファイル

- `apps/mobile/package.json`（`expo-build-properties` 追加）
- `apps/mobile/app.json`（`expo-build-properties` プラグインと ProGuard ルール追加）
- `package-lock.json`（依存更新）
