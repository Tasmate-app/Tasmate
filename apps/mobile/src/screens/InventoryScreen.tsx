import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CHARACTER_DEFINITIONS,
  CRYSTAL_TYPE_LABELS,
  ITEM_CATEGORY_LABELS,
  ITEM_DEFINITIONS,
  getItemDefinition,
  listOwnedItems,
} from '@tasmate/core';
import type { ItemCategory } from '@tasmate/types';
import { useMobileAppStore } from '../stores/appStore';
import {
  Badge,
  ChipGroup,
  Panel,
  ScreenBackground,
  ScreenHeader,
  screenContent,
} from '../ui';
import { colors, fontSize, radius, shadows, spacing, withAlpha } from '../theme/tokens';

type CategoryFilter = 'all' | ItemCategory;

const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'すべて' },
  { value: 'currency', label: ITEM_CATEGORY_LABELS.currency },
  { value: 'progression', label: ITEM_CATEGORY_LABELS.progression },
  { value: 'crystal', label: ITEM_CATEGORY_LABELS.crystal },
  { value: 'character_material', label: ITEM_CATEGORY_LABELS.character_material },
  { value: 'other', label: ITEM_CATEGORY_LABELS.other },
];

const RARITY_COLORS = {
  N: colors.textMuted,
  R: colors.primaryDark,
  SR: colors.accent,
  SSR: colors.orange,
  UR: colors.danger,
} as const;

function characterName(characterId: string): string {
  return CHARACTER_DEFINITIONS.find((definition) => definition.id === characterId)?.name ?? characterId;
}

/** 共通インベントリ（かばん） */
export function InventoryScreen() {
  const itemInventory = useMobileAppStore((s) => s.itemInventory);
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const owned = useMemo(() => listOwnedItems(itemInventory), [itemInventory]);
  const visible = owned.filter((entry) => {
    if (filter === 'all') return true;
    return getItemDefinition(entry.itemId)?.category === filter;
  });
  const ownedKinds = ITEM_DEFINITIONS.filter(
    (definition) => (itemInventory[definition.id] ?? 0) > 0,
  ).length;

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="INVENTORY / ITEMS"
          title="かばん"
          subtitle="タスク報酬で獲得した結晶・素材を全キャラクター共通で管理します。"
          right={
            <View style={styles.countChip}>
              <Text style={styles.countValue}>{ownedKinds}</Text>
              <Text style={styles.countLabel}>種類</Text>
            </View>
          }
        />

        <Panel title="所持品" eyebrow="ITEM BOX" tone="primary">
          <View style={styles.summaryRow}>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryLabel}>硬貨</Text>
              <Text style={styles.summaryValue}>{itemInventory['coin'] ?? 0}</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryLabel}>星屑</Text>
              <Text style={styles.summaryValue}>{itemInventory['stardust'] ?? 0}</Text>
            </View>
          </View>

          <ChipGroup
            options={CATEGORY_OPTIONS}
            selected={[filter]}
            onToggle={(value) => setFilter(value as CategoryFilter)}
            accessibilityLabel="アイテムカテゴリ"
          />

          {visible.length === 0 ? (
            <Text style={styles.note}>
              このカテゴリのアイテムはまだありません。タスクを完了すると報酬が増えます。
            </Text>
          ) : (
            <View style={styles.list}>
              {visible.map((entry) => {
                const definition = getItemDefinition(entry.itemId);
                if (definition === undefined) return null;
                const rarityColor = RARITY_COLORS[definition.rarity];
                return (
                  <View
                    key={entry.itemId}
                    style={[styles.item, { borderColor: withAlpha(rarityColor, 0.35) }]}
                  >
                    <View
                      style={[
                        styles.itemIcon,
                        { backgroundColor: withAlpha(rarityColor, 0.1) },
                      ]}
                    >
                      <Text style={styles.itemIconText}>{definition.icon}</Text>
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemName}>{definition.name}</Text>
                      <View style={styles.itemMetaRow}>
                        <Badge label={definition.rarity} tone={rarityTone(definition.rarity)} />
                        {definition.crystalType !== undefined && (
                          <Text style={styles.itemMeta}>
                            {CRYSTAL_TYPE_LABELS[definition.crystalType]}
                          </Text>
                        )}
                        {definition.characterId !== undefined && (
                          <Text style={styles.itemMeta}>
                            {characterName(definition.characterId)}専用
                          </Text>
                        )}
                      </View>
                      <Text style={styles.itemDesc} numberOfLines={2}>
                        {definition.description}
                      </Text>
                    </View>
                    <Text style={styles.itemQty}>×{entry.quantity}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Panel>
      </ScrollView>
    </ScreenBackground>
  );
}

function rarityTone(rarity: 'N' | 'R' | 'SR' | 'SSR' | 'UR'): 'neutral' | 'primary' | 'accent' | 'warning' | 'danger' {
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

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: screenContent,
  countChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...shadows.soft,
  },
  countValue: {
    color: colors.primaryDark,
    fontSize: fontSize.xl,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  countLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryTile: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  summaryValue: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    ...shadows.soft,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconText: {
    fontSize: 24,
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  itemMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemMeta: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  itemDesc: {
    color: colors.textSubtle,
    fontSize: 10,
    lineHeight: 14,
  },
  itemQty: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
});
