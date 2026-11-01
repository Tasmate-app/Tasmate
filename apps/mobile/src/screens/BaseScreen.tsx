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
  GameButton,
  Panel,
  ProgressBar,
  StatTile,
} from '../ui';
import { attributePalette, colors, fontSize, radius, spacing } from '../theme/tokens';

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
  const canvasHeight = Math.min(430, Math.max(280, Math.round(height * 0.44)));

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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SHARE HOUSE</Text>
        <Text style={styles.title}>拠点</Text>
        <Text style={styles.lead}>
          仲間と暮らすシェアハウス。キャラクターや施設をタップして詳細を確認できます。
        </Text>
      </View>

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
              ? '3Dルーム表示中'
              : modelState === 'error'
                ? '簡易表示に切り替えました'
                : 'ルームを読み込み中'}
          </Text>
        </View>
        <View style={styles.roomHint}>
          <Text style={styles.roomHintText}>机：コイン工房 / 棚：星屑ハウス / 住人をタップして詳細表示</Text>
        </View>
      </View>

      {selectedCharacter !== undefined && selectedCharacterDefinition !== undefined && (
        <Panel
          title={selectedCharacterDefinition.name}
          eyebrow="RESIDENT"
          accentColor={attributePalette[selectedCharacterDefinition.attribute].color}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="選択を解除"
              onPress={clearSelection}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          }
        >
          <View style={styles.characterHero}>
            <View
              style={[
                styles.bigAvatar,
                {
                  backgroundColor: attributePalette[selectedCharacterDefinition.attribute].soft,
                  borderColor: attributePalette[selectedCharacterDefinition.attribute].color,
                },
              ]}
            >
              <Text
                style={[
                  styles.bigAvatarGlyph,
                  { color: attributePalette[selectedCharacterDefinition.attribute].color },
                ]}
              >
                {attributePalette[selectedCharacterDefinition.attribute].glyph}
              </Text>
            </View>
            <View style={styles.characterHeroBody}>
              <Badge
                label={attributePalette[selectedCharacterDefinition.attribute].label}
                tone="primary"
              />
              <Text style={styles.characterDescription}>
                {selectedCharacterDefinition.description}
              </Text>
            </View>
          </View>
          <View style={styles.stats}>
            <StatTile label="レベル" value={`Lv.${selectedCharacter.level}`} />
            <StatTile label="経験値" value={`${selectedCharacter.experience}`} />
            <StatTile
              label="次まで"
              value={`${Math.max(0, experienceToNextLevel(selectedCharacter.level) - selectedCharacter.experience)}`}
            />
          </View>
          <ProgressBar
            value={Math.min(
              100,
              (selectedCharacter.experience /
                Math.max(1, experienceToNextLevel(selectedCharacter.level))) *
                100,
            )}
            height={9}
          />
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
          eyebrow="FACILITY"
          accentColor={colors.secondary}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="選択を解除"
              onPress={clearSelection}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          }
        >
          <View style={styles.facilityStatus}>
            <Badge
              label={selectedFacility.enabled ? '稼働中' : '停止中'}
              tone={selectedFacility.enabled ? 'running' : 'neutral'}
            />
            <Badge label={`Lv.${selectedFacility.level}`} tone="primary" />
          </View>
          <Text style={styles.note}>{selectedFacilityDefinition.description}</Text>
          <View style={styles.stats}>
            <StatTile label="生産" value={facilityProduction(selectedFacilityDefinition)} />
            <StatTile
              label="レベル補正"
              value={`×${(1 + Math.max(0, selectedFacility.level - 1) * BALANCE.facilityPerLevel).toFixed(1)}`}
            />
            <StatTile
              label="強化費用"
              value={`${facilityUpgradeCost(selectedFacility.level)}`}
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

      <Panel title="住人" eyebrow="RESIDENTS" accentColor={colors.accent}>
        <View style={styles.unitList}>
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
                onPress={() => selectCharacter(character.definitionId)}
                style={({ pressed }) => [
                  styles.unit,
                  selected ? styles.unitSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={[styles.unitAvatar, { backgroundColor: palette.soft, borderColor: palette.color }]}>
                  <Text style={[styles.unitAvatarText, { color: palette.color }]}>{palette.glyph}</Text>
                </View>
                <View style={styles.unitBody}>
                  <Text style={styles.unitName}>{definition?.name ?? character.definitionId}</Text>
                  <Text style={styles.note}>Lv.{character.level} / 経験値 {character.experience}</Text>
                  <ProgressBar
                    value={Math.min(
                      100,
                      (character.experience /
                        Math.max(1, experienceToNextLevel(character.level))) *
                        100,
                    )}
                    color={palette.color}
                    height={5}
                  />
                </View>
                <Text style={styles.unitArrow}>›</Text>
              </Pressable>
            );
          })}
        </View>
      </Panel>

      <Panel title="施設" eyebrow="FACILITIES" accentColor={colors.secondary}>
        <View style={styles.unitList}>
          {facilities.map((facility) => {
            const definition = FACILITY_DEFINITIONS.find(
              (item) => item.id === facility.definitionId,
            );
            const selected = facility.definitionId === selectedFacilityId;
            return (
              <Pressable
                key={facility.definitionId}
                accessibilityRole="button"
                onPress={() => selectFacility(facility.definitionId)}
                style={({ pressed }) => [
                  styles.unit,
                  selected ? styles.unitSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.facilityIcon}>
                  <Text style={styles.facilityIconText}>
                    {definition?.type === 'currency' ? '◈' : '✦'}
                  </Text>
                </View>
                <View style={styles.unitBody}>
                  <Text style={styles.unitName}>
                    {definition?.name ?? facility.definitionId} Lv.{facility.level}
                  </Text>
                  <Text style={styles.note}>
                    {definition !== undefined ? facilityProduction(definition) : ''}
                  </Text>
                  <Badge
                    label={facility.enabled ? '稼働中' : '停止中'}
                    tone={facility.enabled ? 'running' : 'neutral'}
                  />
                </View>
                <Text style={styles.unitArrow}>›</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.note}>施設は作業中のみ生産します。停止中の施設は生産しません。</Text>
      </Panel>
    </ScrollView>
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
  roomFrame: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#e7f6ff',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  roomBadge: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roomDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  roomDotReady: {
    backgroundColor: colors.success,
  },
  roomDotError: {
    backgroundColor: colors.danger,
  },
  roomBadgeText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  roomHint: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  roomHintText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
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
  bigAvatar: {
    width: 92,
    height: 92,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigAvatarGlyph: {
    fontSize: 44,
    fontWeight: '900',
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
  facilityStatus: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  unitList: {
    gap: spacing.xs,
  },
  unit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  unitSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryPale,
  },
  pressed: {
    opacity: 0.78,
  },
  unitAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitAvatarText: {
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
  unitBody: {
    flex: 1,
    gap: 3,
  },
  unitName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  unitArrow: {
    color: colors.textSubtle,
    fontSize: 24,
    fontWeight: '300',
  },
  facilityIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondarySoft,
  },
  facilityIconText: {
    color: colors.secondary,
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
});
