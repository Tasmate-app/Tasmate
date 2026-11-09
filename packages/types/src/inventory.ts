/**
 * 共通インベントリの型定義。
 * アイテムは全キャラクター共通の所持数（スタック）で管理する。
 */

/** アイテムの大分類 */
export type ItemCategory =
  | 'currency'
  | 'progression'
  | 'crystal'
  | 'character_material'
  | 'other';

/** アイテムのレアリティ */
export type ItemRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

/** レベル上限解放に使う結晶の種類 */
export type CrystalType =
  | 'knowledge_crystal'
  | 'thought_crystal'
  | 'creation_crystal'
  | 'exploration_crystal'
  | 'effort_crystal';

/** アイテムの主な用途 */
export type ItemUsage = 'level_up' | 'ascension' | 'shop' | 'legacy' | 'none';

/** アイテム定義（マスタ） */
export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  /** 表示用の1文字アイコン。画像アセット導入時は iconUrl を追加する */
  icon: string;
  category: ItemCategory;
  rarity: ItemRarity;
  usage: ItemUsage;
  /** キャラクター専用素材の対象キャラクター */
  characterId?: string;
  /** 結晶の場合の種類 */
  crystalType?: CrystalType;
  /** 一覧表示の並び順 */
  sortOrder?: number;
}

/** アイテムIDごとの所持数 */
export type ItemInventory = Record<string, number>;

/** アイテムの増減理由 */
export type ItemTransactionReason = 'reward' | 'level_up' | 'ascension' | 'migration' | 'other';

/** 素材の獲得・消費履歴 */
export interface ItemTransaction {
  id: string;
  itemId: string;
  /** 正数は獲得、負数は消費 */
  delta: number;
  reason: ItemTransactionReason;
  createdAt: string;
  taskId?: string;
  characterId?: string;
}

/** インベントリ上の1スタック */
export interface ItemStack {
  itemId: string;
  quantity: number;
}
