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
import {
  Badge,
  CharacterEmblem,
  GameButton,
  Panel,
  ProgressBar,
  ScreenBackground,
  ScreenHeader,
  SegmentedControl,
  StatTile,
} from '../ui';
import { attributePalette, colors, fontSize, radius, shadows, spacing } from '../theme/tokens';

type CharacterTab = 'status' | 'growth' | 'history';

export function CharacterScreen() {
  const characters = useMobileAppStore((s) => s.characters);
  const inventory = useMobileAppStore((s) => s.inventory);
  const rewards = useMobileAppStore((s) => s.rewards);
  const levelUpCharacter = useMobileAppStore((s) => s.levelUpCharacter);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<CharacterTab>('status');
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
          right={<Badge label={`${characters.length}人`} tone="primary" />}
        />

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
                  size={52}
                  selected={active}
                />
                <Text style={styles.selectorName} numberOfLines={1}>
                  {characterDefinition?.name ?? character.definitionId}
                </Text>
                <Text style={[styles.selectorMeta, active ? { color: characterPalette.deep } : null]}>
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
                { backgroundColor: palette.soft, borderColor: palette.color },
              ]}
            >
              <View
                pointerEvents="none"
                style={[styles.stageOrb, { backgroundColor: `${palette.color}14` }]}
              />
              <View
                pointerEvents="none"
                style={[styles.stageOrbSmall, { borderColor: `${palette.color}33` }]}
              />
              <View style={styles.stageTop}>
                <View
                  style={[
                    styles.attributeChip,
                    {
                      backgroundColor: `${palette.color}18`,
                      borderColor: `${palette.color}44`,
                    },
                  ]}
                >
                  <Text style={[styles.attributeText, { color: palette.deep }]}>
                    {palette.label}属性
                  </Text>
                </View>
                <Badge label={`Lv.${selected.level}`} tone="primary" />
              </View>

              <View style={styles.stageEmblemWrap}>
                <CharacterEmblem attribute={definition.attribute} size={132} selected />
              </View>

              <View style={styles.stageBottom}>
                <Text style={styles.stageName}>{definition.name}</Text>
                <Text style={styles.stageDescription}>{definition.description}</Text>
                <View style={styles.stageTags}>
                  <Badge
                    label={`基礎効率 ${definition.baseEfficiency.toFixed(1)}`}
                    tone="neutral"
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
                </View>
                <Text style={styles.note}>
                  作業に派遣すると経験値を獲得します。探索先と属性が一致すると収集効率がアップします。
                </Text>
              </Panel>
            )}

            {tab === 'growth' && (
              <Panel title="育成" eyebrow="GROWTH" accentColor={colors.primary}>
                <View style={styles.growthHead}>
                  <CharacterEmblem attribute={definition.attribute} size={64} level={selected.level} />
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
                  <DetailRow label="レベルアップ費用" value={`通貨 ${upgradeCost}`} />
                  <DetailRow label="所持通貨" value={`${inventory.currency}`} />
                  <DetailRow
                    label="レベルアップ後の効率"
                    value={`${(definition.baseEfficiency * (1 + Math.max(0, selected.level) * BALANCE.efficiencyPerLevel)).toFixed(1)}`}
                  />
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
              </Panel>
            )}

            {tab === 'history' && (
              <Panel title="最近の報酬" eyebrow="REWARD HISTORY" accentColor={colors.success}>
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
  selector: {
    gap: spacing.sm,
    paddingVertical: 4,
    paddingRight: spacing.xs,
  },
  selectorCard: {
    width: 92,
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
    borderRadius: radius.xl,
    borderWidth: 2,
    overflow: 'hidden',
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 330,
    ...shadows.card,
  },
  stageOrb: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    right: -70,
    top: -50,
  },
  stageOrbSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    left: -50,
    bottom: -40,
    borderWidth: 18,
  },
  stageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attributeChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  attributeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  stageEmblemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  stageBottom: {
    gap: 3,
  },
  stageName: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  stageDescription: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  stageTags: {
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
