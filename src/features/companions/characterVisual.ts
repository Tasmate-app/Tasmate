import type { CharacterAttribute } from '../../types/index';

/** 属性ごとの見た目（CSS変数クラス＋テキストグリフ。画像アセットは使わない） */
export function attributeClass(attribute: CharacterAttribute): string {
  switch (attribute) {
    case 'sun':
      return 'attr-sun';
    case 'moon':
      return 'attr-moon';
    case 'star':
      return 'attr-star';
    default:
      return 'attr-none';
  }
}

export function attributeGlyph(attribute: CharacterAttribute): string {
  switch (attribute) {
    case 'sun':
      return '☀';
    case 'moon':
      return '🌙';
    case 'star':
      return '★';
    default:
      return '◇';
  }
}
