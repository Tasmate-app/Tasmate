# パーツ構成と命名規則

基準ボクセルキャラクター（`tasmate_character_base`）のアウトライナ階層と命名規則を定義する。

## 1. アウトライナ階層

```
Character_Root
├─ Body
│  ├─ Torso            … 胴体（服）
│  └─ Neck             … 首
├─ Head
│  ├─ Head_Base        … 頭（肌）
│  ├─ Hair_Top         … 頭頂の髪
│  ├─ Hair_Back        … 後ろ髪
│  ├─ Hair_Side_L      … 左の横髪
│  ├─ Hair_Side_R      … 右の横髪
│  └─ Hair_Front       … 前髪
├─ Left_Arm
│  ├─ Arm_L_Mesh
│  └─ Hand_L
│     └─ Hand_L_Mesh
├─ Right_Arm
│  ├─ Arm_R_Mesh
│  └─ Hand_R
│     └─ Hand_R_Mesh
├─ Left_Leg
│  ├─ Leg_L_Mesh
│  └─ Foot_L
│     └─ Foot_L_Mesh
└─ Right_Leg
   ├─ Leg_R_Mesh
   └─ Foot_R
      └─ Foot_R_Mesh
```

## 2. 命名規則

### 2.1 グループ（＝ボーン）

- パーツの役割を表す `Pascal_Snake` 形式（例：`Head_Base`, `Left_Arm`, `Hair_Front`）。
- 左右対称パーツは接尾辞 `_L` / `_R` を付ける（キャラクター自身の左右。+X 側が `_L`）。
- 関節として回転させる単位でグループを切る（肩・手首・股関節・足首・首）。
- グループ名はアニメーションのボーン名として `export` されるため、キャラクター固有の装飾名は付けない。

### 2.2 キューブ（メッシュ）

- ボーン名と重複しないよう `_Mesh` を付ける（例：ボーン `Torso` の形状は `Torso_Mesh`）。
- 分割した形状は `<パーツ>_<部位>`（例：`Hair_Front_C` / `Hair_Front_L` / `Hair_Front_R`）。
- GLTF のノード名が重複しないことを保証する（`three.js` などで名前解決が曖昧になるのを防ぐ）。

### 2.3 基本パーツ一覧

| グループ | 形状キューブ | 役割 |
| --- | --- | --- |
| Body | — | 上半身の親 |
| Torso | Torso_Mesh | 胴体 |
| Neck | Neck_Mesh | 首 |
| Head | — | 頭部の親 |
| Head_Base | Head_Mesh / Face_Mesh | 頭（肌）と顔テクスチャ面 |
| Hair_Top | Hair_Top_Mesh | 頭頂 |
| Hair_Back | Hair_Back_Mesh | 後ろ髪 |
| Hair_Side_L / Hair_Side_R | Hair_Side_*_Mesh | 横髪 |
| Hair_Front | Hair_Front_C / _L / _R | 前髪 |
| Left_Arm / Right_Arm | Arm_*_Mesh | 腕（服） |
| Hand_L / Hand_R | Hand_*_Mesh | 手（肌） |
| Left_Leg / Right_Leg | Leg_*_Mesh | 脚（ズボン） |
| Foot_L / Foot_R | Foot_*_Mesh | 靴 |

## 3. キャラクター派生の命名規則

同じ規格で別キャラクターを作る場合は、ファイル名・識別子に接頭辞を付けて区別する。

- プロジェクト／ファイル：`character_<id>`（例：`character_aoi`, `character_ren`）
- テクスチャ：`character_<id>_atlas.png`
- 出力先：`public/assets/characters/<id>/`
- グループ・ボーン名は基準モデルと共通のまま維持する（アニメーションを共有できるようにする）。
- 体格や髪型などは付加パーツ（例：`Hair_Braid_L`）を追加して表現し、既存ボーンの意味を変更しない。

## 4. レイヤ／面の割り当て方針

- 単一アトラスに集約し、マテリアルは1つに保つ（描画負荷とGLBの肥大化を避ける）。
- 立体感を出すため、面ごとにスワッチを使い分ける（例：正面＝メイン色、側面＝サブ色、上面＝明色）。
- 顔のみ顔領域 UV を使う専用の薄いキューブ（`Face_Mesh`）で表現する。
