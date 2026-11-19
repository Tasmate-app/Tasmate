import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  FACILITY_DEFINITIONS,
  facilityUpgradeCost,
  formatFacilityProduction,
} from '@tasmate/core';
import { useMobileAppStore } from '../stores/appStore';
import {
  Badge,
  GameButton,
  Panel,
  ScreenBackground,
  ScreenHeader,
  StatTile,
} from '../ui';
import { colors, fontSize, radius, shadows, spacing, withAlpha } from '../theme/tokens';

export function ShopScreen() {
  const facilities = useMobileAppStore((s) => s.facilities);
  const inventory = useMobileAppStore((s) => s.inventory);
  const upgradeFacility = useMobileAppStore((s) => s.upgradeFacility);
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="SHOP / UPGRADE"
          title="ショップ"
          subtitle="作業で集めた通貨で施設を強化できます。家具・コスチュームは準備中です。"
        />

        <View style={styles.stats}>
          <StatTile label="所持通貨" value={`${inventory.currency}`} glyph="◈" tone={colors.primaryDark} />
          <StatTile label="強化可能" value={`${facilities.length}`} glyph="⬢" tone={colors.secondary} />
        </View>

        {feedback !== null && (
          <Text accessibilityLiveRegion="polite" style={styles.feedback}>
            {feedback}
          </Text>
        )}

        <Panel
          title="施設強化"
          eyebrow="FACILITY UPGRADE"
          subtitle="所持通貨を消費して、施設の生産量を上げます。"
          tone="primary"
        >
          <View style={styles.list}>
            {facilities.map((facility) => {
              const definition = FACILITY_DEFINITIONS.find(
                (item) => item.id === facility.definitionId,
              );
              const cost = facilityUpgradeCost(facility.level);
              const production =
                definition !== undefined
                  ? formatFacilityProduction(definition, facility.level)
                  : '';
              const canBuy = inventory.currency >= cost;
              return (
                <View key={facility.definitionId} style={styles.card}>
                  <View style={styles.icon}>
                    <Text style={styles.iconText}>
                      {definition?.type === 'currency' ? '◈' : '✦'}
                    </Text>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardHead}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {definition?.name ?? facility.definitionId}
                      </Text>
                      <Badge label={`Lv.${facility.level}`} tone="primary" />
                    </View>
                    <Text style={styles.cardMeta}>現在の生産量 {production}</Text>
                    <GameButton
                      label={canBuy ? `通貨 ${cost} で強化` : `通貨 ${cost}（不足）`}
                      size="sm"
                      disabled={!canBuy}
                      onPress={() => {
                        const ok = upgradeFacility(facility.definitionId);
                        setFeedback(
                          ok
                            ? `「${definition?.name ?? facility.definitionId}」を強化しました！`
                            : '通貨が足りないため購入できません。',
                        );
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </Panel>

        <Panel title="家具" eyebrow="FURNITURE" subtitle="準備中">
          <Text style={styles.note}>
            シェアハウスを飾る家具の購入・配置は初期版以降に対応します。
          </Text>
        </Panel>

        <Panel title="コスチューム" eyebrow="COSTUME" subtitle="準備中">
          <Text style={styles.note}>
            キャラクターの見た目変更は初期版以降に対応します。
          </Text>
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
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  feedback: {
    color: colors.primaryDark,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    ...shadows.soft,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.secondary, 0.14),
    borderWidth: 1,
    borderColor: withAlpha(colors.secondary, 0.3),
  },
  iconText: {
    color: colors.secondary,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  cardName: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
});
