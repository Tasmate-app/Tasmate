import type {
  CrystalType,
  ItemCategory,
  ItemDefinition,
  ItemRarity,
} from '@tasmate/types';

/**
 * アイテム定義（マスタ）。
 * UI に名前・アイコン・説明を直書きせず、必ずこの定義を参照する。
 * アイテム追加時はここへ定義を追加する。
 */

export const ITEM_RARITIES: readonly ItemRarity[] = ['N', 'R', 'SR', 'SSR', 'UR'];

export const ITEM_RARITY_ORDER: Record<ItemRarity, number> = {
  N: 0,
  R: 1,
  SR: 2,
  SSR: 3,
  UR: 4,
};

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  currency: '通貨',
  progression: '育成素材',
  crystal: '結晶',
  character_material: 'キャラクター素材',
  other: 'その他',
};

export const CRYSTAL_TYPES: readonly CrystalType[] = [
  'knowledge_crystal',
  'thought_crystal',
  'creation_crystal',
  'exploration_crystal',
  'effort_crystal',
];

export const CRYSTAL_TYPE_LABELS: Record<CrystalType, string> = {
  knowledge_crystal: '知識の結晶',
  thought_crystal: '思考の結晶',
  creation_crystal: '創造の結晶',
  exploration_crystal: '探究の結晶',
  effort_crystal: '努力の結晶',
};

export const CRYSTAL_TYPE_ICONS: Record<CrystalType, string> = {
  knowledge_crystal: '📘',
  thought_crystal: '🧩',
  creation_crystal: '🎨',
  exploration_crystal: '🔭',
  effort_crystal: '🔥',
};

const CRYSTAL_DESCRIPTIONS: Record<CrystalType, string> = {
  knowledge_crystal: '知識・記憶・理解を象徴する結晶。学んだ情報を定着させる力に共鳴する。',
  thought_crystal: '論理・分析・問題解決を象徴する結晶。答えや解決策を導く力に共鳴する。',
  creation_crystal: '発想・表現・制作を象徴する結晶。新しい成果物を生み出す力に共鳴する。',
  exploration_crystal: '発見・調査・検証を象徴する結晶。未知の事柄を確かめる力に共鳴する。',
  effort_crystal: '継続・鍛錬・習熟を象徴する結晶。反復して技能を磨く力に共鳴する。',
};

/** 結晶アイテムIDを生成する（種類とレアリティで別アイテム） */
export function crystalItemId(type: CrystalType, rarity: ItemRarity): string {
  return `${type}_${rarity}`;
}

export const CRYSTAL_ITEM_IDS: readonly string[] = CRYSTAL_TYPES.flatMap((type) =>
  ITEM_RARITIES.map((rarity) => crystalItemId(type, rarity)),
);

/** キャラクター専用素材の定義ID。対象キャラクター以外には使用できない */
export const CHARACTER_MATERIAL_IDS: Record<string, readonly string[]> = {
  'c-hinata': ['sun_feather', 'life_seed'],
  'c-luna': ['moon_flower', 'mystic_ink'],
  'c-aster': ['arcane_gear', 'beast_claw'],
};

const CHARACTER_MATERIAL_DEFINITIONS: ItemDefinition[] = [
  {
    id: 'sun_feather',
    name: '古代の羽根',
    description: '朝日の光を浴びた古代の羽根。ヒナタの潜在能力を引き出す。',
    icon: '🪶',
    category: 'character_material',
    rarity: 'R',
    usage: 'ascension',
    characterId: 'c-hinata',
    sortOrder: 1,
  },
  {
    id: 'life_seed',
    name: '生命の種',
    description: '芽吹く寸前の小さな種。ヒナタの上限解放に必要な専用素材。',
    icon: '🌱',
    category: 'character_material',
    rarity: 'SR',
    usage: 'ascension',
    characterId: 'c-hinata',
    sortOrder: 2,
  },
  {
    id: 'moon_flower',
    name: '魔力の花',
    description: '月の光で青く咲く花。ルナの潜在能力を引き出す。',
    icon: '🌸',
    category: 'character_material',
    rarity: 'R',
    usage: 'ascension',
    characterId: 'c-luna',
    sortOrder: 3,
  },
  {
    id: 'mystic_ink',
    name: '神秘のインク',
    description: '見えない文字が浮かぶ夜のインク。ルナの上限解放に必要な専用素材。',
    icon: '🖋️',
    category: 'character_material',
    rarity: 'SR',
    usage: 'ascension',
    characterId: 'c-luna',
    sortOrder: 4,
  },
  {
    id: 'arcane_gear',
    name: '魔導歯車',
    description: '星の軌道を刻んだ歯車。アステルの潜在能力を引き出す。',
    icon: '⚙️',
    category: 'character_material',
    rarity: 'R',
    usage: 'ascension',
    characterId: 'c-aster',
    sortOrder: 5,
  },
  {
    id: 'beast_claw',
    name: '魔獣の爪',
    description: '古き魔獣の爪。アステルの上限解放に必要な専用素材。',
    icon: '🐾',
    category: 'character_material',
    rarity: 'SR',
    usage: 'ascension',
    characterId: 'c-aster',
    sortOrder: 6,
  },
];

const CRYSTAL_DEFINITIONS: ItemDefinition[] = CRYSTAL_TYPES.flatMap((type, typeIndex) =>
  ITEM_RARITIES.map((rarity, rarityIndex) => {
    const id = crystalItemId(type, rarity);
    return {
      id,
      name: `${CRYSTAL_TYPE_LABELS[type]}【${rarity}】`,
      description: `${CRYSTAL_DESCRIPTIONS[type]} レアリティ ${rarity}。`,
      icon: CRYSTAL_TYPE_ICONS[type],
      category: 'crystal' as const,
      rarity,
      usage: 'ascension' as const,
      crystalType: type,
      sortOrder: 100 + typeIndex * 10 + rarityIndex,
    } satisfies ItemDefinition;
  }),
);

export const ITEM_DEFINITIONS: readonly ItemDefinition[] = [
  {
    id: 'coin',
    name: '硬貨',
    description: 'タスク完了で獲得する基本通貨。レベルアップやショップで使用する。',
    icon: '🪙',
    category: 'currency',
    rarity: 'N',
    usage: 'level_up',
    sortOrder: 0,
  },
  {
    id: 'stardust',
    name: '星屑',
    description: '実際の学習・作業時間に応じて獲得する育成素材。レベルアップで使用する。',
    icon: '✨',
    category: 'progression',
    rarity: 'N',
    usage: 'level_up',
    sortOrder: 10,
  },
  {
    id: 'shard_sun',
    name: '太陽のかけら',
    description: '探索で得られる素材。既存の収集報酬として保持される。',
    icon: '☀',
    category: 'other',
    rarity: 'N',
    usage: 'legacy',
    sortOrder: 20,
  },
  {
    id: 'shard_moon',
    name: '月のかけら',
    description: '探索で得られる素材。既存の収集報酬として保持される。',
    icon: '☾',
    category: 'other',
    rarity: 'N',
    usage: 'legacy',
    sortOrder: 21,
  },
  {
    id: 'shard_star',
    name: '星のかけら',
    description: '探索で得られる素材。既存の収集報酬として保持される。',
    icon: '☆',
    category: 'other',
    rarity: 'N',
    usage: 'legacy',
    sortOrder: 22,
  },
  ...CRYSTAL_DEFINITIONS,
  ...CHARACTER_MATERIAL_DEFINITIONS,
];

export const ITEM_DEFINITION_MAP: ReadonlyMap<string, ItemDefinition> = new Map(
  ITEM_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  return ITEM_DEFINITION_MAP.get(itemId);
}

export function isKnownItem(itemId: string): boolean {
  return ITEM_DEFINITION_MAP.has(itemId);
}

export function itemDefinitionsByCategory(category: ItemCategory): ItemDefinition[] {
  return ITEM_DEFINITIONS.filter((definition) => definition.category === category);
}

export function characterMaterialDefinitions(characterId: string): ItemDefinition[] {
  const ids = CHARACTER_MATERIAL_IDS[characterId] ?? [];
  return ids.flatMap((id) => {
    const definition = getItemDefinition(id);
    return definition === undefined ? [] : [definition];
  });
}

export function crystalItemIdsByRarity(rarity: ItemRarity): string[] {
  return CRYSTAL_TYPES.map((type) => crystalItemId(type, rarity));
}

export function isCrystalItem(itemId: string): boolean {
  return getItemDefinition(itemId)?.category === 'crystal';
}

/** 定義から結晶の種類を取り出す */
export function crystalTypeOf(itemId: string): CrystalType | undefined {
  return getItemDefinition(itemId)?.crystalType;
}
