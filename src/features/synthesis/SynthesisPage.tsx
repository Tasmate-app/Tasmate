import { useState } from 'react';
import {
  CRYSTAL_SYNTHESIS_SHARDS,
  CRYSTAL_TYPE_ICONS,
  CRYSTAL_TYPE_LABELS,
  ITEM_RARITIES,
  SYNTHESIZABLE_CRYSTAL_TYPES,
  crystalSynthesisRecipe,
  getItemDefinition,
  planCrystalSynthesis,
} from '@tasmate/core';
import type { CrystalType, ItemRarity, MaterialId } from '@tasmate/types';
import { useAppStore } from '../../stores/appStore';

const SHARD_ITEM_IDS: readonly MaterialId[] = ['shard_sun', 'shard_moon', 'shard_star'];

interface Feedback {
  tone: 'success' | 'error';
  message: string;
}

function failureMessage(
  plan: ReturnType<typeof planCrystalSynthesis>,
): string {
  const missingShard = plan.missing.some(
    (entry) => entry.itemId === plan.recipe.shardItemId,
  );
  const missingCoin = plan.missing.some((entry) => entry.itemId === 'coin');
  if (missingShard && missingCoin) return 'かけらと硬貨が足りません。';
  if (missingShard) return 'かけらが足りません。';
  if (missingCoin) return '硬貨が足りません。';
  return '合成できませんでした。';
}

/** 合成（かけらと硬貨から結晶を作る） */
export function SynthesisPage() {
  const itemInventory = useAppStore((s) => s.itemInventory);
  const synthesizeCrystal = useAppStore((s) => s.synthesizeCrystal);
  const [selectedType, setSelectedType] = useState<CrystalType>('knowledge_crystal');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleSynthesize = (type: CrystalType, rarity: ItemRarity) => {
    const crystal = getItemDefinition(crystalSynthesisRecipe(type, rarity).crystalItemId);
    if (synthesizeCrystal(type, rarity)) {
      setFeedback({
        tone: 'success',
        message: `${crystal?.name ?? '結晶'}を合成しました。`,
      });
      return;
    }

    const plan = planCrystalSynthesis(type, rarity, useAppStore.getState().itemInventory);
    setFeedback({ tone: 'error', message: failureMessage(plan) });
  };

  const selectedShardId = CRYSTAL_SYNTHESIS_SHARDS[selectedType];
  const selectedShard = getItemDefinition(selectedShardId);

  return (
    <div className="game-screen">
      <div className="game-container synthesis">
        <header className="synthesis-head">
          <div>
            <h1 className="game-screen__title">合成</h1>
            <p className="list-item__meta companion-lead">
              集めたかけらと硬貨を合成して、キャラクターの上限解放に使う結晶を作れます。
            </p>
          </div>
          <div className="synthesis-wallet" aria-label="所持素材">
            <div className="synthesis-wallet__item">
              <span aria-hidden="true">🪙</span>
              <span>硬貨</span>
              <strong>{itemInventory['coin'] ?? 0}</strong>
            </div>
            {SHARD_ITEM_IDS.map((itemId) => {
              const definition = getItemDefinition(itemId);
              return (
                <div key={itemId} className="synthesis-wallet__item">
                  <span aria-hidden="true">{definition?.icon}</span>
                  <span>{definition?.name}</span>
                  <strong>{itemInventory[itemId] ?? 0}</strong>
                </div>
              );
            })}
          </div>
        </header>

        {feedback !== null && (
          <p
            className={`synthesis-feedback synthesis-feedback--${feedback.tone}`}
            role="status"
          >
            {feedback.message}
          </p>
        )}

        <section className="synthesis-panel" aria-label="結晶の合成">
          <div className="synthesis-types" role="tablist" aria-label="結晶の種類">
            {SYNTHESIZABLE_CRYSTAL_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={selectedType === type}
                className={`synthesis-type${selectedType === type ? ' is-active' : ''}`}
                onClick={() => setSelectedType(type)}
              >
                <span aria-hidden="true">{CRYSTAL_TYPE_ICONS[type]}</span>
                <span>{CRYSTAL_TYPE_LABELS[type]}</span>
              </button>
            ))}
          </div>

          <div className="synthesis-workbench">
            <div className="synthesis-workbench__head">
              <span className="synthesis-workbench__icon" aria-hidden="true">
                {CRYSTAL_TYPE_ICONS[selectedType]}
              </span>
              <div>
                <h2>{CRYSTAL_TYPE_LABELS[selectedType]}</h2>
                <p className="list-item__meta">
                  {selectedShard?.icon} {selectedShard?.name}と硬貨を使って合成します。
                </p>
              </div>
            </div>

            <ul className="synthesis-recipes" aria-label="レアリティ別レシピ">
              {ITEM_RARITIES.map((rarity) => {
                const plan = planCrystalSynthesis(selectedType, rarity, itemInventory);
                const { recipe } = plan;
                const crystal = getItemDefinition(recipe.crystalItemId);
                const shard = getItemDefinition(recipe.shardItemId);
                const ownedShard = itemInventory[recipe.shardItemId] ?? 0;
                const ownedCoin = itemInventory['coin'] ?? 0;
                const ownedCrystal = itemInventory[recipe.crystalItemId] ?? 0;
                const rarityClass = `rarity-${rarity.toLowerCase()}`;

                return (
                  <li
                    key={rarity}
                    className={`synthesis-recipe ${rarityClass}`}
                  >
                    <div className="synthesis-recipe__title">
                      <span className={`rarity-badge ${rarityClass}`}>{rarity}</span>
                      <span>{crystal?.name ?? recipe.crystalItemId}</span>
                    </div>
                    <div className="synthesis-recipe__costs">
                      <span
                        className={
                          ownedShard < recipe.shardQuantity ? 'is-missing' : undefined
                        }
                      >
                        <span aria-hidden="true">{shard?.icon}</span>{' '}
                        {shard?.name}{' '}
                        <strong>{recipe.shardQuantity}</strong>
                        <span className="synthesis-recipe__owned">
                          {' '}
                          / 所持 {ownedShard}
                        </span>
                      </span>
                      <span className={ownedCoin < recipe.coinQuantity ? 'is-missing' : undefined}>
                        <span aria-hidden="true">🪙</span> 硬貨{' '}
                        <strong>{recipe.coinQuantity}</strong>
                        <span className="synthesis-recipe__owned">
                          {' '}
                          / 所持 {ownedCoin}
                        </span>
                      </span>
                    </div>
                    <div className="synthesis-recipe__footer">
                      <span className="synthesis-recipe__have">
                        所持 <strong>{ownedCrystal}</strong>
                      </span>
                      <button
                        type="button"
                        className="btn"
                        disabled={!plan.canSynthesize}
                        aria-label={`${crystal?.name ?? recipe.crystalItemId}を合成`}
                        onClick={() => handleSynthesize(selectedType, rarity)}
                      >
                        合成する
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
