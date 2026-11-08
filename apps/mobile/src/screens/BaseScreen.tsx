import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  BALANCE,
  CHARACTER_DEFINITIONS,
  FACILITY_DEFINITIONS,
  MATERIAL_NAMES,
  experienceToNextLevel,
  facilityUpgradeCost,
  levelUpCost,
} from '@tasmate/core';
import type { FacilityDefinition } from '@tasmate/types';
import { RoomScene } from '../game3d/RoomScene';
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

type ModelState = 'loading' | 'ready' | 'error';

function facilityProduction(definition: FacilityDefinition): string {
  if (definition.type === 'currency') {
    return `通貨 ${definition.baseProductionPerMinute}/分`;
  }
  return `${MATERIAL_NAMES[definition.materialId ?? ''] ?? '素材'} ${definition.baseProductionPerMinute}/分`;
}

export function BaseScreen() {
  const router = useRouter();
  const characters = useMobileAppStore((s) => s.characters);
  const facilities = useMobileAppStore((s) => s.facilities);
  const inventory = useMobileAppStore((s) => s.inventory);
  const levelUpCharacter = useMobileAppStore((s) => s.levelUpCharacter);
  const upgradeFacility = useMobileAppStore((s) => s.upgradeFacility);
  const toggleFacility = useMobileAppStore((s) => s.toggleFacility);

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [modelState, setModelState] = useState<ModelState>('loading');
  const [feedback, setFeedback] = useState<string | null>(null);

  const { height } = useWindowDimensions();
  const canvasHeight = Math.min(520, Math.max(340, Math.round(height * 0.52)));
  const activeFacilities = facilities.filter((facility) => facility.enabled).length;

  const selectedCharacter = characters.find(
    (character) => character.definitionId === selectedCharacterId,
  );
  const selectedCharacterDefinition = CHARACTER_DEFINITIONS.find(
    (definition) => definition.id === selectedCharacterId,
  );
  const selectedFacility = facilities.find(
    (facility) => facility.definitionId === selectedFacilityId,
  );
  const selectedFacilityDefinition = FACILITY_DEFINITIONS.find(
    (definition) => definition.id === selectedFacilityId,
  );

  const selectCharacter = (id: string) => {
    setSelectedCharacterId(id);
    setSelectedFacilityId(null);
    setFeedback(null);
  };
  const selectFacility = (id: string) => {
    setSelectedFacilityId(id);
    setSelectedCharacterId(null);
    setFeedback(null);
  };
  const clearSelection = () => {
    setSelectedCharacterId(null);
    setSelectedFacilityId(null);
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
          eyebrow="BASE / SHARE HOUSE"
          title="拠点"
          subtitle="3Dシェアハウスを拠点に、仲間と施設を育てよう。"
          right={
            <View style={styles.baseChip}>
              <View style={styles.baseChipIcon}>
                <Text style={styles.baseChipGlyph}>⌂</Text>
              </View>
              <View>
                <Text style={styles.baseChipValue}>
                  {activeFacilities}/{facilities.length}
                </Text>
                <Text style={styles.baseChipLabel}>施設稼働</Text>
              </View>
            </View>
          }
        />

        <View style={[styles.roomFrame, { height: canvasHeight }]}>
          <RoomScene
            characters={characters.map((character) => {
              const definition = CHARACTER_DEFINITIONS.find(
                (item) => item.id === character.definitionId,
              );
              return {
                definitionId: character.definitionId,
                color: attributePalette[definition?.attribute ?? 'none'].color,
              };
            })}
            selectedCharacterId={selectedCharacterId}
            selectedFacilityId={selectedFacilityId}
            onSelectCharacter={selectCharacter}
            onSelectFacility={selectFacility}
            onClearSelection={clearSelection}
            onModelReady={() => setModelState('ready')}
            onModelError={() => setModelState('error')}
          />
          <View pointerEvents="none" style={styles.roomTop}>
            <View style={styles.roomTitleOverlay}>
              <Text style={styles.roomEyebrow}>SHARE HOUSE / HOME</Text>
              <Text style={styles.roomTitle}>みんなの拠点</Text>
            </View>
            <View style={styles.roomBadge}>
              <View
                style={[
                  styles.roomDot,
                  modelState === 'ready'
                    ? styles.roomDotReady
                    : modelState === 'error'
                      ? styles.roomDotError
                      : null,
                ]}
              />
              <Text style={styles.roomBadgeText}>
                {modelState === 'ready'
                  ? '3D表示中'
                  : modelState === 'error'
                    ? '簡易表示'
                    : '読み込み中'}
              </Text>
            </View>
          </View>
          <View pointerEvents="none" style={styles.roomHint}>
            <Text style={styles.roomHintText}>
              机：コイン工房 / 棚：星屑ハウス / 住人をタップして詳細を表示
            </Text>
          </View>
          <View pointerEvents="none" style={styles.roomShine} />
        </View>

        <View style={styles.quickRow}>
          <QuickStat
            glyph="✦"
            label="住人"
            value={`${characters.length}`}
            unit="人"
            color={colors.accent}
          />
          <QuickStat
            glyph="⌂"
            label="稼働施設"
            value={`${activeFacilities}`}
            unit={` / ${facilities.length}`}
            color={colors.secondary}
          />
          <GameButton
            label="キャラ画面 →"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/character')}
            style={styles.quickAction}
          />
        </View>

        {selectedCharacter !== undefined && selectedCharacterDefinition !== undefined && (
          <Panel
            title={selectedCharacterDefinition.name}
            eyebrow="RESIDENT / STATUS"
            accentColor={attributePalette[selectedCharacterDefinition.attribute].color}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="選択を解除"
                onPress={clearSelection}
                style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            }
          >
            <View style={styles.characterHero}>
              <View
                style={[
                  styles.portraitFrame,
                  {
                    backgroundColor: attributePalette[selectedCharacterDefinition.attribute].soft,
                    borderColor: withAlpha(
                      attributePalette[selectedCharacterDefinition.attribute].color,
                      0.3,
                    ),
                  },
                ]}
              >
                <CharacterPortrait
                  attribute={selectedCharacterDefinition.attribute}
                  size={104}
                  level={selectedCharacter.level}
                />
              </View>
              <View style={styles.characterHeroBody}>
                <Badge
                  label={`${attributePalette[selectedCharacterDefinition.attribute].label}属性`}
                  tone="primary"
                />
                <Text style={styles.characterDescription}>
                  {selectedCharacterDefinition.description}
                </Text>
                <View style={styles.characterLevelRow}>
                  <Text style={styles.characterLevel}>Lv.{selectedCharacter.level}</Text>
                  <Text style={styles.characterLevelMeta}>
                    経験値 {selectedCharacter.experience} /{' '}
                    {experienceToNextLevel(selectedCharacter.level)}
                  </Text>
                </View>
                <ProgressBar
                  value={Math.min(
                    100,
                    (selectedCharacter.experience /
                      Math.max(1, experienceToNextLevel(selectedCharacter.level))) *
                      100,
                  )}
                  color={attributePalette[selectedCharacterDefinition.attribute].color}
                  height={9}
                />
              </View>
            </View>
            <View style={styles.stats}>
              <StatTile
                label="レベル"
                value={`Lv.${selectedCharacter.level}`}
                glyph="✦"
                tone={attributePalette[selectedCharacterDefinition.attribute].deep}
              />
              <StatTile
                label="所持経験値"
                value={`${selectedCharacter.experience}`}
                glyph="◈"
              />
              <StatTile
                label="次まで"
                value={`${Math.max(0, experienceToNextLevel(selectedCharacter.level) - selectedCharacter.experience)}`}
                glyph="↑"
                tone={colors.primaryDark}
              />
            </View>
            <Text style={styles.note}>
              基礎効率 {selectedCharacterDefinition.baseEfficiency.toFixed(1)} / レベルアップ費用 通貨
              {levelUpCost(selectedCharacter.level)}
            </Text>
            <View style={styles.actions}>
              <GameButton
                label="キャラクター画面で育成"
                variant="secondary"
                onPress={() => router.push('/character')}
                style={styles.action}
              />
              <GameButton
                label={
                  selectedCharacter.experience <
                  experienceToNextLevel(selectedCharacter.level)
                    ? '経験値不足'
                    : inventory.currency < levelUpCost(selectedCharacter.level)
                      ? '通貨不足'
                      : `レベルアップ（${levelUpCost(selectedCharacter.level)}）`
                }
                disabled={
                  selectedCharacter.experience <
                    experienceToNextLevel(selectedCharacter.level) ||
                  inventory.currency < levelUpCost(selectedCharacter.level)
                }
                onPress={() => {
                  const ok = levelUpCharacter(selectedCharacter.definitionId);
                  setFeedback(ok ? 'レベルアップしました。' : 'レベルアップできませんでした。');
                }}
                style={styles.action}
              />
            </View>
            {feedback !== null && <Text style={styles.feedback}>{feedback}</Text>}
          </Panel>
        )}

        {selectedFacility !== undefined && selectedFacilityDefinition !== undefined && (
          <Panel
            title={selectedFacilityDefinition.name}
            eyebrow="FACILITY / PRODUCTION"
            accentColor={colors.secondary}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="選択を解除"
                onPress={clearSelection}
                style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            }
          >
            <View style={styles.facilityHero}>
              <View style={styles.facilityIconLarge}>
                <Text style={styles.facilityIconLargeText}>
                  {selectedFacilityDefinition.type === 'currency' ? '◈' : '✦'}
                </Text>
              </View>
              <View style={styles.facilityHeroBody}>
                <View style={styles.facilityStatus}>
                  <Badge
                    label={selectedFacility.enabled ? '稼働中' : '停止中'}
                    tone={selectedFacility.enabled ? 'running' : 'neutral'}
                  />
                  <Badge label={`Lv.${selectedFacility.level}`} tone="primary" />
                </View>
                <Text style={styles.note}>{selectedFacilityDefinition.description}</Text>
                <Text style={styles.facilityRate}>
                  {selectedFacilityDefinition.type === 'currency' ? 'コイン生産' : '素材生産'} /{' '}
                  {facilityProduction(selectedFacilityDefinition)}
                </Text>
              </View>
            </View>
            <View style={styles.stats}>
              <StatTile
                label="生産"
                value={facilityProduction(selectedFacilityDefinition)}
                glyph="◈"
                tone={colors.secondary}
              />
              <StatTile
                label="レベル補正"
                value={`×${(1 + Math.max(0, selectedFacility.level - 1) * BALANCE.facilityPerLevel).toFixed(1)}`}
                glyph="↑"
              />
              <StatTile
                label="強化費用"
                value={`${facilityUpgradeCost(selectedFacility.level)}`}
                glyph="◆"
                tone={colors.warning}
              />
            </View>
            <View style={styles.actions}>
              <GameButton
                label={
                  inventory.currency < facilityUpgradeCost(selectedFacility.level)
                    ? '通貨不足'
                    : `強化（通貨 ${facilityUpgradeCost(selectedFacility.level)}）`
                }
                disabled={inventory.currency < facilityUpgradeCost(selectedFacility.level)}
                onPress={() => {
                  const ok = upgradeFacility(selectedFacility.definitionId);
                  setFeedback(ok ? '施設を強化しました。' : '通貨が足りません。');
                }}
                style={styles.action}
              />
              <GameButton
                label={selectedFacility.enabled ? '稼働を停止' : '稼働を再開'}
                variant="secondary"
                onPress={() => {
                  toggleFacility(selectedFacility.definitionId);
                  setFeedback(null);
                }}
                style={styles.action}
              />
            </View>
            {feedback !== null && <Text style={styles.feedback}>{feedback}</Text>}
          </Panel>
        )}

        <Panel
          title="住人"
          eyebrow="RESIDENTS"
          subtitle="タップしてプロフィールと育成状況を確認"
          tone="accent"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
          >
            {characters.map((character) => {
              const definition = CHARACTER_DEFINITIONS.find(
                (item) => item.id === character.definitionId,
              );
              const attribute = definition?.attribute ?? 'none';
              const palette = attributePalette[attribute];
              const selected = character.definitionId === selectedCharacterId;
              return (
                <Pressable
                  key={character.definitionId}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => selectCharacter(character.definitionId)}
                  style={({ pressed }) => [
                    styles.unitCard,
                    {
                      borderColor: selected
                        ? palette.color
                        : withAlpha(palette.color, 0.22),
                      backgroundColor: selected ? palette.soft : colors.surfaceMuted,
                    },
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <CharacterEmblem
                    attribute={attribute}
                    size={58}
                    level={character.level}
                    selected={selected}
                  />
                  <Text style={styles.unitName} numberOfLines={1}>
                    {definition?.name ?? character.definitionId}
                  </Text>
                  <Text style={styles.unitMeta}>
                    {palette.label} / 経験値 {character.experience}
                  </Text>
                  <ProgressBar
                    value={Math.min(
                      100,
                      (character.experience /
                        Math.max(1, experienceToNextLevel(character.level))) *
                        100,
                    )}
                    color={palette.color}
                    height={6}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </Panel>

        <Panel
          title="施設"
          eyebrow="FACILITIES"
          subtitle="タップして生産状況と強化メニューを確認"
          tone="secondary"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
          >
            {facilities.map((facility) => {
              const definition = FACILITY_DEFINITIONS.find(
                (item) => item.id === facility.definitionId,
              );
              const selected = facility.definitionId === selectedFacilityId;
              return (
                <Pressable
                  key={facility.definitionId}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => selectFacility(facility.definitionId)}
                  style={({ pressed }) => [
                    styles.unitCard,
                    styles.facilityCard,
                    selected ? styles.unitCardSelected : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View
                    style={[
                      styles.facilityIcon,
                      facility.enabled ? styles.facilityIconActive : null,
                    ]}
                  >
                    <Text style={styles.facilityIconText}>
                      {definition?.type === 'currency' ? '◈' : '✦'}
                    </Text>
                  </View>
                  <Text style={styles.unitName} numberOfLines={1}>
                    {definition?.name ?? facility.definitionId}
                  </Text>
                  <Text style={styles.unitMeta}>Lv.{facility.level}</Text>
                  <Badge
                    label={facility.enabled ? '稼働中' : '停止中'}
                    tone={facility.enabled ? 'running' : 'neutral'}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.note}>施設は作業中のみ生産します。停止中の施設は生産しません。</Text>
        </Panel>
      </ScrollView>
    </ScreenBackground>
  );
}

function QuickStat({
  glyph,
  label,
  value,
  unit,
  color,
}: {
  glyph: string;
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <View style={styles.quickTile}>
      <View style={[styles.quickIcon, { backgroundColor: withAlpha(color, 0.13) }]}>
        <Text style={[styles.quickGlyph, { color }]}>{glyph}</Text>
      </View>
      <View>
        <Text style={styles.quickLabel}>{label}</Text>
        <Text style={styles.quickValue}>
          {value}
          <Text style={styles.quickUnit}>{unit}</Text>
        </Text>
      </View>
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
  baseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondarySoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#a9e6dc',
    paddingHorizontal: 9,
    paddingVertical: 5,
    ...shadows.soft,
  },
  baseChipIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
  },
  baseChipGlyph: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  baseChipValue: {
    color: '#0b7f70',
    fontSize: fontSize.md,
    fontWeight: '900',
    lineHeight: 16,
  },
  baseChipLabel: {
    color: '#0b7f70',
    fontSize: 8,
    fontWeight: '800',
  },
  roomFrame: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: '#e7f6ff',
    borderWidth: 2,
    borderColor: colors.surface,
    ...shadows.card,
  },
  roomTop: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    top: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  roomTitleOverlay: {
    backgroundColor: colors.surfaceGlassStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...shadows.soft,
  },
  roomEyebrow: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  roomTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceGlassStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
    ...shadows.soft,
  },
  roomDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  roomDotReady: {
    backgroundColor: colors.success,
  },
  roomDotError: {
    backgroundColor: colors.danger,
  },
  roomBadgeText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  roomHint: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: colors.surfaceGlassStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  roomHintText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  roomShine: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: spacing.sm,
    height: 1,
    backgroundColor: colors.highlight,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  quickTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    ...shadows.soft,
  },
  quickIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickGlyph: {
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  quickLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  quickValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '900',
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  quickUnit: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  quickAction: {
    flex: 1.1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryPale,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeText: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '800',
    marginTop: -2,
  },
  characterHero: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  portraitFrame: {
    width: 120,
    height: 132,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  characterHeroBody: {
    flex: 1,
    gap: spacing.xs,
  },
  characterDescription: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  characterLevelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  characterLevel: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  characterLevelMeta: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
  feedback: {
    color: colors.primaryDark,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  facilityHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  facilityIconLarge: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondarySoft,
    borderWidth: 1,
    borderColor: '#a9e6dc',
  },
  facilityIconLargeText: {
    color: colors.secondary,
    fontSize: 32,
    fontWeight: '900',
  },
  facilityHeroBody: {
    flex: 1,
    gap: spacing.xs,
  },
  facilityStatus: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  facilityRate: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  rail: {
    gap: spacing.sm,
    paddingVertical: 2,
    paddingRight: spacing.xs,
  },
  unitCard: {
    width: 128,
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  facilityCard: {
    width: 140,
  },
  unitCardSelected: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondarySoft,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  unitName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
    textAlign: 'center',
  },
  unitMeta: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  facilityIcon: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  facilityIconActive: {
    backgroundColor: colors.secondarySoft,
    borderColor: '#a9e6dc',
  },
  facilityIconText: {
    color: colors.secondary,
    fontSize: fontSize.xxl,
    fontWeight: '900',
  },
});
