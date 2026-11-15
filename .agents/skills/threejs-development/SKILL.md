---
name: threejs-development
description: Three.js、React Three Fiber、expo-gl、3Dシェアハウス、キャラクター・家具モデル、カメラや3DインタラクションをWeb・Nativeで実装するときに使用する。
---

# Three.js Development

## 配置
- Webの3Dは `src/game3d/` に集約する。React Three FiberとThree.jsを使う。
- Nativeの3Dは `apps/mobile/src/game3d/` に集約する。expo-gl上でThree.jsを使う。
- ゲームルールや正規データは `packages/core/` に置き、3D側へ埋め込まない。3D側の状態を正規データとして扱わない。
- 通常UIと3Dシーンの責務を分離し、3D描画の負荷やエラーがタスク管理・タイマーに波及しにくい構造にする。
- 家具・キャラクターの配置データと、実際の3Dモデル描画を可能な限り分離する。

## モデルとアセット
- 3Dモデルは原則としてGLB/glTF形式を優先する。
- Webは `public/assets/` 配下、Nativeは `apps/mobile/assets/` 配下のアセットを使い、パス解決を各プラットフォームの方法に合わせる。
- キャラクターの寸法・座標・パーツ階層は `docs/characters/*.md` の規格に従う。
- 大きなモデルやテクスチャを無計画に追加しない。読み込み失敗時に画面がクラッシュしないようフォールバックを用意する。

## 実装ルール
- 初期段階では最小限の部屋と仮モデルで動作を確認する。
- 不要な毎フレーム処理やReactの再レンダリングを避ける。
- ジオメトリ・マテリアル・テクスチャの再利用と、アンマウント時のリソース解放を意識する。
- 読み込みキャンセル時やアンマウント時に、遅れて完了したローダーが状態を更新しないようにする。
- クリック・タップ対象の判定と表示上のオブジェクトを対応づける。
- カメラ操作はプラットフォームごとに実装が異なる。NativeでOrbitControlsがそのまま使えると仮定しない。`apps/mobile/src/game3d/orbitCamera.ts` と `TouchCameraControls.tsx` の方式を確認する。
- パフォーマンス問題は計測してから対処し、根拠のない最適化で複雑化しない。
- `apps/mobile/android/` はprebuild生成物のため編集しない。

## 確認項目
- シーンの初期化と破棄
- モデル読み込み成功・失敗時の表示
- クリック・タップ・選択などのインタラクション
- カメラ操作と画面サイズ・向きの変化
- リソース解放とメモリ使用
- 3Dシーンが通常UIの操作を妨げないこと

## テストと確認
- カメラ計算は `tests/mobileOrbitCamera.test.ts` のように純粋関数へ切り出してテストする。
- Webは `npm run e2e` とブラウザで、Nativeは型チェック・Expo Go・実機で確認する。
- Nativeの3Dは実機での描画・タッチ操作・復帰時の挙動を確認する。
