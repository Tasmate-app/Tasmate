# Hinata Voxel Model Notes

## Files

- `hinata.bbmodel` — editable Blockbench project
- `hinata.glb` — glTF 2.0 binary export with embedded texture
- `hinata_atlas.png` — 256x256 texture atlas
- `hinata-model-notes.md` — this file

## Source and conventions

- Reference: `hinata.png`
- Base model conventions: `docs/characters/voxel-character-standard.md`
- Naming conventions: `docs/characters/parts-and-naming.md`
- Blockbench format: Generic Model / `free`
- Authored height: 24 units (feet at y=0, top of head at y=24)
- Axes: +Y up, +Z front, +X character left

## Model overview

- 280 cubes, organized under `Character_Root`.
- Preserved base hierarchy: `Root`, `Hips`, `Torso`, `Neck`, `Head_Base`, `Face_Details`, `Hair_Top`, `Hair_Front`, `Hair_Back`, `Hair_Side_L/R`, `Ahoge`, `Hair_Accessory`, arms, legs, feet.
- Chibi proportions with a 9.4-unit-wide head and layered blue-silver hair.
- Hair includes bangs, side locks, long back strands, crown layers, an ahoge, and a 7-petal blue flower accessory on the character's left.
- Outfit: navy uniform jacket with cyan trim and buttons, white collar, large cyan bow, pleated navy skirt with pale hem, white socks with blue bands, and navy shoes.
- Face uses the base model's textured `Face_Mesh` approach: a 160x128 anime face region copied into the lower-left of `hinata_atlas.png` and mapped onto a thin front plane at `z=4.0625`.
- Geometric eye/mouth/blush/nose cubes were removed; the face is texture-driven.
- Face eyebrows were recolored from brown to blue-gray `(110,134,161)`.

## Texture

- Atlas: 256x256, 16x16 swatches.
- Palette indices 0-35 include skin, hair, navy/cyan uniform colors, eye colors, mouth/blush, outline, and shadow.
- Face region: `(0,128)` to `(160,256)`.
- The GLB embeds the atlas; the `.bbmodel` also contains the texture source.

## Export

- GLB: glTF 2.0 binary, `scale=1`, `embed_textures=true`, `armature=false`.
- Verified GLB contents: 280 meshes, 306 nodes, 1 material, 1 image, 1 scene.
- No animations are included yet.
- For a 1.6 m character, scale the loaded model by approximately `1.6 / 24 = 0.0667`.

## Known limitations

- The face is a flat 2D plane, consistent with the base model. There is no 3D nose, so the side profile is stylized and hair-heavy.
- The side/back hair silhouette is intentionally broad and blocky; it reads best from the front and three-quarter views.
- The skirt is boxy from the side and reads mostly through its front pleats and hem.
- No animation clips, rigging, or runtime integration have been added.
