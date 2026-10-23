import type {
  CharacterDefinition,
  Destination,
  FacilityDefinition,
} from '../types/index';

/**
 * 仮マスタデータ（MVP 用）。
 * キャラ・戦闘先・施設の正式な定義は未確定のため、試作の仮値である。
 */

export const CHARACTER_DEFINITIONS: CharacterDefinition[] = [
  {
    id: 'c-hinata',
    name: 'ヒナタ',
    attribute: 'sun',
    baseEfficiency: 1.0,
    description: '元気いっぱいの朝型キャラ。朝日の丘との相性がよい。',
  },
  {
    id: 'c-luna',
    name: 'ルナ',
    attribute: 'moon',
    baseEfficiency: 1.2,
    description: '夜更かしが得意な静かなキャラ。月夜の遺跡との相性がよい。',
  },
  {
    id: 'c-aster',
    name: 'アステル',
    attribute: 'star',
    baseEfficiency: 0.9,
    description: '星読みが趣味の変わり者。星降る原野との相性がよい。',
  },
];

export const DESTINATIONS: Destination[] = [
  {
    id: 'd-hills',
    name: '朝日の丘',
    description: '太陽のかけらが眠る初心者向けの丘。',
    availableMaterials: { shard_sun: 0.7, shard_star: 0.3 },
    baseEfficiency: 1.0,
    recommendedAttributes: ['sun'],
  },
  {
    id: 'd-ruins',
    name: '月夜の遺跡',
    description: '月のかけらが見つかる静かな遺跡。',
    availableMaterials: { shard_moon: 0.7, shard_star: 0.3 },
    baseEfficiency: 1.1,
    recommendedAttributes: ['moon'],
  },
  {
    id: 'd-plains',
    name: '星降る原野',
    description: '星のかけらが舞う広大な原野。やや効率が高い。',
    availableMaterials: { shard_star: 0.6, shard_sun: 0.2, shard_moon: 0.2 },
    baseEfficiency: 1.2,
    recommendedAttributes: ['star'],
  },
];

export const FACILITY_DEFINITIONS: FacilityDefinition[] = [
  {
    id: 'f-coin',
    name: 'コイン工房',
    type: 'currency',
    description: '作業中にゲーム内通貨を生産する。',
    baseProductionPerMinute: 5,
  },
  {
    id: 'f-star',
    name: '星屑ハウス',
    type: 'material',
    description: '作業中に星のかけらを生産する。',
    baseProductionPerMinute: 0.4,
    materialId: 'shard_star',
  },
];
