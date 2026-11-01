import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  BALANCE,
  CHARACTER_DEFINITIONS,
  MATERIAL_NAMES,
  experienceToNextLevel,
  levelUpCost,
} from '@tasmate/core';
import { useMobileAppStore } from '../stores/appStore';
import { Badge, GameButton, Panel, ProgressBar, StatTile } from '../ui';
import { attributePalette, colors, fontSize, radius, spacing } from '../theme/tokens';

export function CharacterScreen() {
  const characters = useMobileAppStore((s) => s.characters);
  const inventory = useMobileAppStore((s) => s.inventory);
  const rewards = useMobileAppStore((s) => s.rewards);
  const levelUpCharacter = useMobileAppStore((s) => s.levelUpCharacter);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId !== null && characters.some((c) => c.definitionId === selectedId)) return;
    setSelectedId(characters[0]?.definitionId ?? null);
  }, [characters, selectedId]);

  const selected =
    characters.find((character) => character.definitionId === selectedId) ??
    characters[0] ??
    null;
  const definition =
    selected !== null
      ? CHARACTER_DEFINITIONS.find((item) => item.id === selected.definitionId)
      : undefined;
  const palette = attributePalette[definition?.attribute ?? 'none'];
  const nextExp = selected !== null ? experienceToNextLevel(selected.level) : 0;
  const upgradeCost = selected !== null ? levelUpCost(selected.level) : 0;
  const canLevelUp =
    selected !== null &&
    selected.experience >= nextExp &&
    inventory.currency >= upgradeCost;

  const selectCharacter = (id: string) => {
    setSelectedId(id);
    setFeedback(null);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CHARACTER</Text>
        <Text style={styles.title}>キャラクター</Text>
        <Text style={styles.lead}>
          仲間を選んで能力を確認。作業で得た経験値と通貨を使って育成できます。
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selector}
      >
        {characters.map((character) => {
          const characterDefinition = CHARACTER_DEFINITIONS.find(
            (item) => item.id === character.definitionId,
          );
          const characterPalette = attributePalette[characterDefinition?.attribute ?? 'none'];
          const active = selected?.definitionId === character.definitionId;
          return (
            <Pressable
              key={character.definitionId}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => selectCharacter(character.definitionId)}
              style={({ pressed }) => [
                styles.selectorCard,
                active
                  ? {
                      borderColor: characterPalette.color,
                      backgroundColor: characterPalette.soft,
                    }
                  : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View
                style={[
                  styles.selectorAvatar,
                  {
                    backgroundColor: characterPalette.soft,
                    borderColor: characterPalette.color,
                  },
                ]}
              >
                <Text style={[styles.selectorGlyph, { color: characterPalette.color }]}>
                  {characterPalette.glyph}
                </Text>
              </View>
              <Text style={styles.selectorName}>
                {characterDefinition?.name ?? character.definitionId}
              </Text>
              <Text style={styles.selectorMeta}>Lv.{character.level}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selected !== null && definition !== undefined ? (
        <>
          <View style={[styles.showcase, { backgroundColor: palette.soft, borderColor: palette.color }]}>
            <View style={styles.showcaseGlow} />
            <Text style={[styles.showcaseGlyph, { color: palette.color }]}>{palette.glyph}</Text>
            <View style={styles.showcaseBody}>
              <Text style={[styles.attribute, { color: palette.color }]}>{palette.label}属性</Text>
              <Text style={styles.showcaseName}>{definition.name}</Text>
              <Text style={styles.showcaseDescription}>{definition.description}</Text>
              <View style={styles.showcaseTags}>
                <Badge label={`Lv.${selected.level}`} tone="primary" />
                <Badge label={`基礎効率 ${definition.baseEfficiency.toFixed(1)}`} tone="neutral" />
              </View>
            </View>
          </View>

          <Panel title="能力と育成" eyebrow="STATUS" accentColor={palette.color}>
            <View style={styles.stats}>
              <StatTile label="レベル" value={`Lv.${selected.level}`} />
              <StatTile label="所持経験値" value={`${selected.experience}`} />
              <StatTile
                label="次のLvまで"
                value={`${Math.max(0, nextExp - selected.experience)}`}
                tone={colors.primaryDark}
              />
            </View>
            <View style={styles.expBlock}>
              <View style={styles.expHead}>
                <Text style={styles.expLabel}>経験値</Text>
                <Text style={styles.expValue}>
                  {Math.min(selected.experience, nextExp)} / {nextExp}
                </Text>
              </View>
              <ProgressBar
                value={Math.min(100, (selected.experience / Math.max(1, nextExp)) * 100)}
                color={palette.color}
                height={10}
              />
            </View>

            <View style={styles.detailRows}>
              <DetailRow label="基本効率" value={definition.baseEfficiency.toFixed(1)} />
              <DetailRow
                label="レベル補正"
                value={`×${(1 + Math.max(0, selected.level - 1) * BALANCE.efficiencyPerLevel).toFixed(1)}`}
              />
              <DetailRow
                label="探索先と属性一致"
                value={`×${BALANCE.affinityBonus.toFixed(1)}`}
              />
              <DetailRow label="レベルアップ費用" value={`通貨 ${upgradeCost}`} />
              <DetailRow label="所持通貨" value={`${inventory.currency}`} />
            </View>

            <GameButton
              label={
                selected.experience < nextExp
                  ? '経験値が足りません'
                  : inventory.currency < upgradeCost
                    ? '通貨が足りません'
                    : `レベルアップ（通貨 ${upgradeCost}）`
              }
              onPress={() => {
                const ok = levelUpCharacter(selected.definitionId);
                setFeedback(ok ? 'レベルアップしました。' : 'レベルアップできませんでした。');
              }}
              disabled={!canLevelUp}
              size="lg"
            />
            {feedback !== null && <Text style={styles.feedback}>{feedback}</Text>}
            <Text style={styles.note}>
              作業に派遣すると経験値を獲得します。探索先と属性が一致すると収集効率がアップします。
            </Text>
          </Panel>
        </>
      ) : (
        <Panel title="キャラクターがいません" eyebrow="CHARACTER">
          <Text style={styles.note}>所持キャラクターがいません。</Text>
        </Panel>
      )}

      <Panel title="最近の報酬" eyebrow="REWARD HISTORY" accentColor={colors.success}>
        {rewards.length === 0 ? (
          <Text style={styles.note}>クエストを完了すると、ここに報酬が記録されます。</Text>
        ) : (
          <View style={styles.rewardList}>
            {rewards.slice(0, 5).map((reward) => (
              <View key={reward.id} style={styles.rewardRow}>
                <View style={styles.rewardTop}>
                  <Text style={styles.rewardTitle}>
                    通貨 +{reward.finalReward.currency} / 経験値 +{reward.finalReward.experience}
                  </Text>
                  <Text style={styles.rewardDate}>
                    {new Date(reward.createdAt).toLocaleDateString('ja-JP')}
                  </Text>
                </View>
                {Object.entries(reward.finalReward.materials).length > 0 && (
                  <Text style={styles.rewardMaterials}>
                    {Object.entries(reward.finalReward.materials)
                      .map(([id, amount]) => `${MATERIAL_NAMES[id] ?? id} +${amount ?? 0}`)
                      .join(' / ')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </Panel>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: 2,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  lead: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  selector: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  selectorCard: {
    width: 112,
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  pressed: {
    opacity: 0.78,
  },
  selectorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorGlyph: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
  },
  selectorName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  selectorMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  showcase: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 190,
  },
  showcaseGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.45)',
    right: -70,
    top: -80,
  },
  showcaseGlyph: {
    fontSize: 86,
    fontWeight: '900',
    opacity: 0.9,
  },
  showcaseBody: {
    flex: 1,
    gap: spacing.xs,
  },
  attribute: {
    fontSize: fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  showcaseName: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  showcaseDescription: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  showcaseTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  expBlock: {
    gap: spacing.xs,
  },
  expHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  expValue: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  detailRows: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceAlt,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  detailValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  feedback: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
  rewardList: {
    gap: spacing.xs,
  },
  rewardRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    gap: 2,
  },
  rewardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rewardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  rewardDate: {
    color: colors.textSubtle,
    fontSize: fontSize.xs,
  },
  rewardMaterials: {
    color: colors.primaryDark,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
