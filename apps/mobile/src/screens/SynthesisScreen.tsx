import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { useMobileAppStore } from '../stores/appStore';
import {
  Badge,
  ChipGroup,
  GameButton,
  Panel,
  ScreenBackground,
  ScreenHeader,
  screenContent,
} from '../ui';
import {
  colors,
  fontSize,
  radius,
  shadows,
  spacing,
  withAlpha,
} from '../theme/tokens';

const SHARD_ITEM_IDS: readonly MaterialId[] = ['shard_sun', 'shard_moon', 'shard_star'];

const RARITY_COLORS: Record<ItemRarity, string> = {
  N: colors.textMuted,
  R: colors.primaryDark,
  SR: colors.accent,
  SSR: colors.orange,
  UR: colors.danger,
};

function rarityTone(
  rarity: ItemRarity,
): 'neutral' | 'primary' | 'accent' | 'warning' | 'danger' {
  switch (rarity) {
    case 'R':
      return 'primary';
    case 'SR':
      return 'accent';
    case 'SSR':
      return 'warning';
    case 'UR':
      return 'danger';
    default:
      return 'neutral';
  }
}

interface Feedback {
  tone: 'success' | 'error';
  message: string;
}

function failureMessage(plan: ReturnType<typeof planCrystalSynthesis>): string {
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
export function SynthesisScreen() {
  const itemInventory = useMobileAppStore((s) => s.itemInventory);
  const synthesizeCrystal = useMobileAppStore((s) => s.synthesizeCrystal);
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

    const plan = planCrystalSynthesis(
      type,
      rarity,
      useMobileAppStore.getState().itemInventory,
    );
    setFeedback({ tone: 'error', message: failureMessage(plan) });
  };

  const selectedShardId = CRYSTAL_SYNTHESIS_SHARDS[selectedType];
  const selectedShard = getItemDefinition(selectedShardId);

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="SYNTHESIS / CRYSTALS"
          title="合成"
          subtitle="集めたかけらと硬貨から、上限解放に使う結晶を作れます。"
          right={
            <View style={styles.coinChip}>
              <Text style={styles.coinIcon}>🪙</Text>
              <Text style={styles.coinValue}>{itemInventory['coin'] ?? 0}</Text>
            </View>
          }
        />

        <Panel title="かけら" eyebrow="MATERIALS" tone="primary">
          <View style={styles.materialRow}>
            {SHARD_ITEM_IDS.map((itemId) => {
              const definition = getItemDefinition(itemId);
              return (
                <View key={itemId} style={styles.materialTile}>
                  <Text style={styles.materialIcon}>{definition?.icon}</Text>
                  <Text style={styles.materialName} numberOfLines={1}>
                    {definition?.name}
                  </Text>
                  <Text style={styles.materialValue}>{itemInventory[itemId] ?? 0}</Text>
                </View>
              );
            })}
          </View>
        </Panel>

        {feedback !== null && (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.feedback,
              feedback.tone === 'success' ? styles.feedbackSuccess : styles.feedbackError,
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                feedback.tone === 'success'
                  ? styles.feedbackTextSuccess
                  : styles.feedbackTextError,
              ]}
            >
              {feedback.message}
            </Text>
          </View>
        )}

        <Panel
          title="結晶を合成"
          eyebrow="WORKBENCH"
          tone="accent"
          subtitle={`${selectedShard?.icon ?? ''} ${selectedShard?.name ?? ''}と硬貨を消費します。`}
        >
          <ChipGroup
            options={SYNTHESIZABLE_CRYSTAL_TYPES.map((type) => ({
              value: type,
              label: CRYSTAL_TYPE_LABELS[type],
            }))}
            selected={[selectedType]}
            onToggle={(value) => setSelectedType(value as CrystalType)}
            accessibilityLabel="結晶の種類"
          />

          <View style={styles.selectedHead}>
            <View style={styles.selectedIcon}>
              <Text style={styles.selectedIconText}>{CRYSTAL_TYPE_ICONS[selectedType]}</Text>
            </View>
            <View style={styles.selectedText}>
              <Text style={styles.selectedTitle}>{CRYSTAL_TYPE_LABELS[selectedType]}</Text>
              <Text style={styles.selectedMeta}>
                必要かけら: {selectedShard?.name} / 硬貨
              </Text>
            </View>
          </View>

          <View style={styles.recipeList}>
            {ITEM_RARITIES.map((rarity) => {
              const plan = planCrystalSynthesis(selectedType, rarity, itemInventory);
              const { recipe } = plan;
              const crystal = getItemDefinition(recipe.crystalItemId);
              const shard = getItemDefinition(recipe.shardItemId);
              const ownedShard = itemInventory[recipe.shardItemId] ?? 0;
              const ownedCoin = itemInventory['coin'] ?? 0;
              const ownedCrystal = itemInventory[recipe.crystalItemId] ?? 0;
              const rarityColor = RARITY_COLORS[rarity];

              return (
                <View
                  key={rarity}
                  style={[styles.recipe, { borderColor: withAlpha(rarityColor, 0.35) }]}
                >
                  <View style={styles.recipeHead}>
                    <Badge label={rarity} tone={rarityTone(rarity)} />
                    <Text style={styles.recipeName} numberOfLines={2}>
                      {crystal?.name ?? recipe.crystalItemId}
                    </Text>
                    <Text style={styles.recipeOwned}>所持 {ownedCrystal}</Text>
                  </View>

                  <View style={styles.costList}>
                    <Text
                      style={[
                        styles.costLine,
                        ownedShard < recipe.shardQuantity ? styles.costMissing : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.costStrong,
                          ownedShard < recipe.shardQuantity ? styles.costStrongMissing : null,
                        ]}
                      >
                        {shard?.icon} {shard?.name} {recipe.shardQuantity}
                      </Text>
                      {`  / 所持 ${ownedShard}`}
                    </Text>
                    <Text
                      style={[
                        styles.costLine,
                        ownedCoin < recipe.coinQuantity ? styles.costMissing : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.costStrong,
                          ownedCoin < recipe.coinQuantity ? styles.costStrongMissing : null,
                        ]}
                      >
                        🪙 硬貨 {recipe.coinQuantity}
                      </Text>
                      {`  / 所持 ${ownedCoin}`}
                    </Text>
                  </View>

                  <GameButton
                    label="合成する"
                    size="sm"
                    onPress={() => handleSynthesize(selectedType, rarity)}
                    disabled={!plan.canSynthesize}
                    accessibilityLabel={`${crystal?.name ?? recipe.crystalItemId}を合成`}
                  />
                </View>
              );
            })}
          </View>
        </Panel>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: screenContent,
  coinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...shadows.soft,
  },
  coinIcon: {
    fontSize: fontSize.sm,
  },
  coinValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  materialRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  materialTile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  materialIcon: {
    fontSize: 22,
  },
  materialName: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  materialValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  feedback: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  feedbackSuccess: {
    borderColor: '#a9ecd1',
    backgroundColor: colors.successSoft,
  },
  feedbackError: {
    borderColor: '#f5b5c4',
    backgroundColor: colors.dangerSoft,
  },
  feedbackText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  feedbackTextSuccess: {
    color: colors.success,
  },
  feedbackTextError: {
    color: colors.danger,
  },
  selectedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  selectedIconText: {
    fontSize: 22,
  },
  selectedText: {
    flex: 1,
    gap: 2,
  },
  selectedTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  selectedMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  recipeList: {
    gap: spacing.sm,
  },
  recipe: {
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    ...shadows.soft,
  },
  recipeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recipeName: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  recipeOwned: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  costList: {
    gap: 2,
  },
  costLine: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  costStrong: {
    color: colors.text,
    fontWeight: '900',
  },
  costStrongMissing: {
    color: colors.danger,
  },
  costMissing: {
    color: colors.danger,
  },
});
