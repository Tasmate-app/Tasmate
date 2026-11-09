import { useMemo, useState } from 'react';
import {
  CRYSTAL_TYPE_LABELS,
  ITEM_CATEGORY_LABELS,
  ITEM_DEFINITIONS,
  ITEM_RARITY_ORDER,
  getItemDefinition,
  listOwnedItems,
} from '@tasmate/core';
import type { ItemCategory, ItemDefinition } from '@tasmate/types';
import { CHARACTER_DEFINITIONS } from '../../data/seed';
import { useAppStore } from '../../stores/appStore';

type CategoryFilter = 'all' | ItemCategory;

const CATEGORY_FILTERS: ReadonlyArray<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'すべて' },
  { id: 'currency', label: ITEM_CATEGORY_LABELS.currency },
  { id: 'progression', label: ITEM_CATEGORY_LABELS.progression },
  { id: 'crystal', label: ITEM_CATEGORY_LABELS.crystal },
  { id: 'character_material', label: ITEM_CATEGORY_LABELS.character_material },
  { id: 'other', label: ITEM_CATEGORY_LABELS.other },
];

function usageLabel(definition: ItemDefinition): string {
  switch (definition.usage) {
    case 'level_up':
      return 'レベルアップで使用';
    case 'ascension':
      return 'レベル上限解放で使用';
    case 'shop':
      return 'ショップで使用';
    case 'legacy':
      return '既存の収集素材';
    default:
      return '用途未設定';
  }
}

function characterName(characterId: string): string {
  return CHARACTER_DEFINITIONS.find((definition) => definition.id === characterId)?.name ?? characterId;
}

/** 共通インベントリ（かばん）。全キャラクター共通の所持数を表示する */
export function InventoryPanel() {
  const itemInventory = useAppStore((s) => s.itemInventory);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const owned = useMemo(() => listOwnedItems(itemInventory), [itemInventory]);
  const visible = useMemo(
    () =>
      owned.filter((entry) => {
        if (filter === 'all') return true;
        return getItemDefinition(entry.itemId)?.category === filter;
      }),
    [owned, filter],
  );
  const selected = selectedId === null ? undefined : getItemDefinition(selectedId);
  const selectedQuantity = selectedId === null ? 0 : (itemInventory[selectedId] ?? 0);

  const ownedKinds = ITEM_DEFINITIONS.filter((definition) => (itemInventory[definition.id] ?? 0) > 0)
    .length;

  return (
    <section className="inventory-panel" aria-label="所持アイテム">
      <div className="inventory-summary">
        <div>
          <p className="inventory-summary__label">所持アイテム種類</p>
          <strong>{ownedKinds}</strong>
        </div>
        <div>
          <p className="inventory-summary__label">星屑</p>
          <strong>{itemInventory['stardust'] ?? 0}</strong>
        </div>
      </div>

      <div className="inventory-filters" role="tablist" aria-label="アイテムカテゴリ">
        {CATEGORY_FILTERS.map((category) => (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={filter === category.id}
            className={`inventory-filter${filter === category.id ? ' is-active' : ''}`}
            onClick={() => setFilter(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="list-item__meta inventory-empty">
          このカテゴリのアイテムはまだありません。タスクを完了すると報酬が増えます。
        </p>
      ) : (
        <ul className="inventory-grid" aria-label="所持アイテム一覧">
          {visible.map((entry) => {
            const definition = getItemDefinition(entry.itemId);
            if (definition === undefined) return null;
            return (
              <li key={entry.itemId}>
                <button
                  type="button"
                  className={`inventory-card rarity-${definition.rarity.toLowerCase()}${
                    selectedId === entry.itemId ? ' is-selected' : ''
                  }`}
                  onClick={() => setSelectedId(entry.itemId)}
                >
                  <span className="inventory-card__icon" aria-hidden="true">
                    {definition.icon}
                  </span>
                  <span className="inventory-card__body">
                    <span className="inventory-card__name">{definition.name}</span>
                    <span className="inventory-card__meta">
                      <span className={`rarity-badge rarity-${definition.rarity.toLowerCase()}`}>
                        {definition.rarity}
                      </span>
                      {definition.crystalType !== undefined && (
                        <span>{CRYSTAL_TYPE_LABELS[definition.crystalType]}</span>
                      )}
                    </span>
                  </span>
                  <span className="inventory-card__qty">×{entry.quantity}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected !== undefined && (
        <aside className="inventory-detail" aria-label={`${selected.name}の詳細`}>
          <div className="inventory-detail__head">
            <span className="inventory-detail__icon" aria-hidden="true">
              {selected.icon}
            </span>
            <div>
              <h2 className="inventory-detail__name">{selected.name}</h2>
              <p className="inventory-detail__meta">
                <span className={`rarity-badge rarity-${selected.rarity.toLowerCase()}`}>
                  {selected.rarity}
                </span>{' '}
                {ITEM_CATEGORY_LABELS[selected.category]} ・ 所持 {selectedQuantity}
              </p>
            </div>
            <button
              type="button"
              className="btn btn--secondary inventory-detail__close"
              onClick={() => setSelectedId(null)}
            >
              閉じる
            </button>
          </div>
          <p className="inventory-detail__desc">{selected.description}</p>
          <dl className="inventory-detail__rows">
            <div>
              <dt>用途</dt>
              <dd>{usageLabel(selected)}</dd>
            </div>
            {selected.characterId !== undefined && (
              <div>
                <dt>対象キャラクター</dt>
                <dd>{characterName(selected.characterId)}専用</dd>
              </div>
            )}
            <div>
              <dt>レアリティ順</dt>
              <dd>{ITEM_RARITY_ORDER[selected.rarity] + 1} / 5</dd>
            </div>
          </dl>
        </aside>
      )}
    </section>
  );
}
