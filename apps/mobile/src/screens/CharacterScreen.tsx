import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  BALANCE,
  CHARACTER_DEFINITIONS,
  MATERIAL_NAMES,
  getItemDefinition,
  planAscension,
  planLevelUp,
} from '@tasmate/core';
import { useMobileAppStore } from '../stores/appStore';
import {
  Badge,
  CharacterEmblem,
  CharacterPortrait,
  GameButton,
  Panel,
  ProgressBar,
  ScreenBackground,
  ScreenHeader,
  SegmentedControl,
  StatTile,
} from '../ui';
import {
  attributePalette,
  colors,
  fontSize,
  radius,
  shadows,
  spacing,
  withAlpha,
} from '../theme/tokens';

type CharacterTab = 'status' | 'growth' | 'history';

export function CharacterScreen() {
  const characters = useMobileAppStore((s) => s.characters);
  const inventory = useMobileAppStore((s) => s.inventory);
  const itemInventory = useMobileAppStore((s) => s.itemInventory);
  const rewards = useMobileAppStore((s) => s.rewards);
  const levelUpCharacter = useMobileAppStore((s) => s.levelUpCharacter);
  const ascendCharacter = useMobileAppStore((s) => s.ascendCharacter);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<CharacterTab>('status');
  const [feedback, setFeedback] = useState<string | null>(null);
  const { width } = useWindowDimensions();

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
  const levelPlan = selected !== null ? planLevelUp(selected, itemInventory) : null;
  const ascensionPlan = selected !== null ? planAscension(selected, itemInventory) : null;
  const nextExp = levelPlan?.requiredExperience ?? 0;
  const coinCost = levelPlan?.items.find((stack) => stack.itemId === 'coin')?.quantity ?? 0;
  const stardustCost =
    levelPlan?.items.find((stack) => stack.itemId === 'stardust')?.quantity ?? 0;
  const portraitSize = Math.min(236, Math.max(176, Math.round(width * 0.5)));
  const canLevelUp = levelPlan?.canLevelUp ?? false;
  const atMaxLevel = selected !== null && levelPlan !== null && selected.level >= levelPlan.maxLevel;

  const selectCharacter = (id: string) => {
    setSelectedId(id);
    setFeedback(null);
  };

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="CHARACTER / ROSTER"
          title="キャラクター"
          subtitle="仲間を選んで能力を確認。作業で得た経験値と通貨で育成できます。"
          right={
            <View style={styles.rosterChip}>
              <Text style={styles.rosterValue}>{characters.length}</Text>
              <Text style={styles.rosterLabel}>人</Text>
            </View>
          }
        />

        <View style={styles.selectorHead}>
          <Text style={styles.selectorTitle}>仲間を選択</Text>
          <Text style={styles.selectorHint}>タップでプロフィールを切り替え</Text>
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
                <CharacterEmblem
                  attribute={characterDefinition?.attribute ?? 'none'}
                  size={50}
                  selected={active}
                />
                <Text style={styles.selectorName} numberOfLines={1}>
                  {characterDefinition?.name ?? character.definitionId}
                </Text>
                <Text
                  style={[styles.selectorMeta, active ? { color: characterPalette.deep } : null]}
                >
                  Lv.{character.level}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {selected !== null && definition !== undefined ? (
          <>
            <View
              style={[
                styles.stage,
                { backgroundColor: palette.soft, borderColor: withAlpha(palette.color, 0.4) },
              ]}
            >
              <View
                pointerEvents="none"
                style={[styles.stageOrb, { backgroundColor: withAlpha(palette.color, 0.12) }]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.stageOrbSmall,
                  {
                    borderColor: withAlpha(palette.color, 0.2),
                    backgroundColor: withAlpha(colors.white, 0.35),
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[styles.stageShine, { backgroundColor: withAlpha(colors.white, 0.45) }]}
              />
              <View style={styles.stageTop}>
                <View
                  style={[
                    styles.attributeChip,
                    {
                      backgroundColor: withAlpha(palette.color, 0.13),
                      borderColor: withAlpha(palette.color, 0.35),
                    },
                  ]}
                >
                  <Text style={[styles.attributeGlyph, { color: palette.deep }]}>
                    {palette.glyph}
                  </Text>
                  <Text style={[styles.attributeText, { color: palette.deep }]}>
                    {palette.label}属性
                  </Text>
                </View>
                <View style={styles.stageBadges}>
                  <Badge label={`Lv.${selected.level}`} tone="gold" />
                  <Badge label="出撃可能" tone="primary" />
                </View>
              </View>

              <View style={styles.stagePortrait}>
                <CharacterPortrait
                  attribute={definition.attribute}
                  size={portraitSize}
                  level={selected.level}
                  selected
                />
              </View>

              <View style={styles.stageBottom}>
                <View style={styles.stageNameRow}>
                  <View style={styles.stageNameBlock}>
                    <Text style={styles.stageName}>{definition.name}</Text>
                    <Text style={styles.stageRole}>SHARE HOUSE RESIDENT</Text>
                  </View>
                  <View style={[styles.efficiencyBadge, { borderColor: palette.color }]}>
                    <Text style={styles.efficiencyLabel}>基礎効率</Text>
                    <Text style={[styles.efficiencyValue, { color: palette.deep }]}>
                      {definition.baseEfficiency.toFixed(1)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.stageDescription}>{definition.description}</Text>
                <View style={styles.stageExp}>
                  <View style={styles.stageExpHead}>
                    <Text style={styles.stageExpLabel}>NEXT LEVEL</Text>
                    <Text style={styles.stageExpValue}>
                      {Math.min(selected.experience, nextExp)} / {nextExp}
                    </Text>
                  </View>
                  <ProgressBar
                    value={Math.min(100, (selected.experience / Math.max(1, nextExp)) * 100)}
                    color={palette.color}
                    height={10}
                  />
                </View>
              </View>
            </View>

            <SegmentedControl
              options={[
                { value: 'status', label: 'ステータス' },
                { value: 'growth', label: '育成' },
                { value: 'history', label: '履歴' },
              ]}
              value={tab}
              onChange={(value) => setTab(value as CharacterTab)}
            />

            {tab === 'status' && (
              <Panel title="能力値" eyebrow="STATUS" accentColor={palette.color}>
                <View style={styles.stats}>
                  <StatTile
                    label="レベル"
                    value={`Lv.${selected.level}`}
                    glyph="✦"
                    tone={palette.deep}
                  />
                  <StatTile
                    label="所持経験値"
                    value={`${selected.experience}`}
                    glyph="◈"
                  />
                  <StatTile
                    label="次のLvまで"
                    value={`${Math.max(0, nextExp - selected.experience)}`}
                    glyph="↑"
                    tone={colors.primaryDark}
                  />
                </View>
                <View style={styles.expBlock}>
                  <View style={styles.expHead}>
                    <Text style={styles.expLabel}>経験値ゲージ</Text>
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
                </View>
                <Text style={styles.note}>
                  作業に派遣すると経験値を獲得し、貯まると自動でレベルアップします。探索先と属性が一致すると収集効率がアップします。
                </Text>
              </Panel>
            )}

            {tab === 'growth' && (
              <Panel title="育成" eyebrow="GROWTH" tone="primary">
                <View style={styles.growthHead}>
                  <View
                    style={[
                      styles.growthPortrait,
                      { backgroundColor: palette.soft, borderColor: withAlpha(palette.color, 0.3) },
                    ]}
                  >
                    <CharacterPortrait
                      attribute={definition.attribute}
                      size={88}
                      level={selected.level}
                    />
                  </View>
                  <View style={styles.growthHeadBody}>
                    <Text style={styles.growthName}>{definition.name}</Text>
                    <Text style={styles.growthMeta}>
                      経験値 {Math.min(selected.experience, nextExp)} / {nextExp}
                    </Text>
                    <ProgressBar
                      value={Math.min(100, (selected.experience / Math.max(1, nextExp)) * 100)}
                      color={palette.color}
                      height={8}
                    />
                  </View>
                </View>

                <View style={styles.detailRows}>
                  <DetailRow
                    label="レベルアップ費用"
                    value={`硬貨 ${coinCost} / 星屑 ${stardustCost}`}
                  />
                  <DetailRow label="所持通貨" value={`${inventory.currency}`} />
                  <DetailRow
                    label="レベル上限"
                    value={`Lv.${levelPlan?.maxLevel ?? 0}${
                      selected.ascensionStage !== undefined && selected.ascensionStage > 0
                        ? `（解放 ${selected.ascensionStage}）`
                        : ''
                    }`}
                  />
                  <DetailRow
                    label="レベルアップ後の効率"
                    value={`${(definition.baseEfficiency * (1 + Math.max(0, selected.level) * BALANCE.efficiencyPerLevel)).toFixed(1)}`}
                  />
                </View>

                <Text style={styles.note}>
                  経験値が貯まると自動でレベルアップします。硬貨と星屑を使えば、経験値が足りなくても早めにレベルアップできます。
                </Text>

                <GameButton
                  label={
                    atMaxLevel
                      ? 'レベル上限に到達'
                      : !canLevelUp
                        ? '素材が足りません'
                        : `素材でレベルアップ（硬貨 ${coinCost} / 星屑 ${stardustCost}）`
                  }
                  onPress={() => {
                    const ok = levelUpCharacter(selected.definitionId);
                    setFeedback(ok ? 'レベルアップしました。' : 'レベルアップできませんでした。');
                  }}
                  disabled={!canLevelUp}
                  size="lg"
                />

                {ascensionPlan !== null && ascensionPlan.requirement !== null && (
                  <View style={styles.ascensionBox}>
                    <Text style={styles.ascensionTitle}>
                      上限解放 Lv.{ascensionPlan.requirement.fromMaxLevel} → Lv.
                      {ascensionPlan.requirement.toMaxLevel}
                    </Text>
                    <Text style={styles.ascensionCost}>
                      {ascensionPlan.requirement.crystals.rarity} 結晶 ×
                      {ascensionPlan.requirement.crystals.quantity}（任意種類）
                    </Text>
                    <Text style={styles.ascensionCost}>
                      {getItemDefinition(ascensionPlan.requirement.characterMaterial.itemId)?.name ??
                        ascensionPlan.requirement.characterMaterial.itemId}{' '}
                      ×
                      {ascensionPlan.requirement.characterMaterial.quantity}
                    </Text>
                    <Text style={styles.ascensionCost}>
                      硬貨 {ascensionPlan.requirement.coins}
                    </Text>
                    <GameButton
                      label={
                        ascensionPlan.canAscend
                          ? 'レベル上限を解放'
                          : !atMaxLevel
                            ? `Lv.${ascensionPlan.currentMaxLevel} で解放可能`
                            : '素材が足りません'
                      }
                      onPress={() => {
                        const ok = ascendCharacter(selected.definitionId);
                        setFeedback(ok ? 'レベル上限を解放しました。' : '上限解放できませんでした。');
                      }}
                      disabled={!ascensionPlan.canAscend}
                      variant="secondary"
                    />
                  </View>
                )}
                {feedback !== null && <Text style={styles.feedback}>{feedback}</Text>}
              </Panel>
            )}

            {tab === 'history' && (
              <Panel title="最近の報酬" eyebrow="REWARD HISTORY" tone="success">
                {rewards.length === 0 ? (
                  <Text style={styles.note}>
                    クエストを完了すると、ここに報酬が記録されます。
                  </Text>
                ) : (
                  <View style={styles.rewardList}>
                    {rewards.slice(0, 5).map((reward) => (
                      <View key={reward.id} style={styles.rewardRow}>
                        <View style={styles.rewardTop}>
                          <Text style={styles.rewardTitle}>
                            通貨 +{reward.finalReward.currency} / 経験値 +
                            {reward.finalReward.experience}
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
            )}
          </>
        ) : (
          <Panel title="キャラクターがいません" eyebrow="CHARACTER">
            <Text style={styles.note}>所持キャラクターがいません。</Text>
          </Panel>
        )}
      </ScrollView>
    </ScreenBackground>
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
    backgroundColor: 'transparent',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  rosterChip: {
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
  rosterValue: {
    color: colors.primaryDark,
    fontSize: fontSize.xl,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  rosterLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  selectorHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  selectorTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  selectorHint: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
  },
  selector: {
    gap: spacing.sm,
    paddingVertical: 2,
    paddingRight: spacing.xs,
  },
  selectorCard: {
    width: 96,
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...shadows.soft,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  selectorName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  selectorMeta: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  stage: {
    borderRadius: radius.xxl,
    borderWidth: 2,
    overflow: 'hidden',
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 360,
    ...shadows.card,
  },
  stageOrb: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    right: -76,
    top: -54,
  },
  stageOrbSmall: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    left: -54,
    bottom: -46,
    borderWidth: 18,
  },
  stageShine: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: spacing.sm,
    height: 2,
    borderRadius: 2,
  },
  stageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  attributeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  attributeGlyph: {
    fontSize: 11,
    fontWeight: '900',
  },
  attributeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  stageBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  stagePortrait: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  stageBottom: {
    gap: spacing.sm,
  },
  stageNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stageNameBlock: {
    flex: 1,
    gap: 0,
  },
  stageName: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.3,
    lineHeight: 34,
  },
  stageRole: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  efficiencyBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  efficiencyLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },
  efficiencyValue: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  stageDescription: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  stageExp: {
    gap: spacing.xs,
  },
  stageExpHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stageExpLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  stageExpValue: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
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
    fontVariant: ['tabular-nums'],
  },
  detailRows: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
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
    fontVariant: ['tabular-nums'],
  },
  growthHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  growthPortrait: {
    width: 104,
    height: 112,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  growthHeadBody: {
    flex: 1,
    gap: 4,
  },
  growthName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  growthMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  ascensionBox: {
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primaryPale,
    padding: spacing.sm,
  },
  ascensionTitle: {
    color: colors.primaryDark,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  ascensionCost: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
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
