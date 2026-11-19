import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  FACILITY_DEFINITIONS,
  facilityLevelFactor,
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
  screenContent,
} from '../ui';
import { colors, fontSize, radius, shadows, spacing, withAlpha } from '../theme/tokens';

export function FacilitiesScreen() {
  const facilities = useMobileAppStore((s) => s.facilities);
  const inventory = useMobileAppStore((s) => s.inventory);
  const upgradeFacility = useMobileAppStore((s) => s.upgradeFacility);
  const toggleFacility = useMobileAppStore((s) => s.toggleFacility);

  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(
    facilities[0]?.definitionId ?? null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const selected = facilities.find((facility) => facility.definitionId === selectedFacilityId);
  const selectedDefinition = FACILITY_DEFINITIONS.find(
    (definition) => definition.id === selectedFacilityId,
  );
  const activeFacilities = facilities.filter((facility) => facility.enabled).length;

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="FACILITIES / PRODUCTION"
          title="施設"
          subtitle="施設の生産状況を確認し、通貨で強化したり稼働を切り替えたりできます。"
        />

        <View style={styles.stats}>
          <StatTile label="稼働中" value={`${activeFacilities}`} glyph="⌂" tone={colors.secondary} />
          <StatTile label="施設数" value={`${facilities.length}`} glyph="⬢" />
          <StatTile label="所持通貨" value={`${inventory.currency}`} glyph="◈" tone={colors.primaryDark} />
        </View>

        <Panel title="施設一覧" eyebrow="FACILITY LIST" tone="secondary">
          <View style={styles.list}>
            {facilities.map((facility) => {
              const definition = FACILITY_DEFINITIONS.find(
                (item) => item.id === facility.definitionId,
              );
              const selectedCard = facility.definitionId === selectedFacilityId;
              return (
                <Pressable
                  key={facility.definitionId}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedCard }}
                  onPress={() => {
                    setSelectedFacilityId(facility.definitionId);
                    setFeedback(null);
                  }}
                  style={({ pressed }) => [
                    styles.card,
                    selectedCard ? styles.cardSelected : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View
                    style={[
                      styles.icon,
                      facility.enabled ? styles.iconActive : null,
                    ]}
                  >
                    <Text style={styles.iconText}>
                      {definition?.type === 'currency' ? '◈' : '✦'}
                    </Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {definition?.name ?? facility.definitionId}
                    </Text>
                    <Text style={styles.cardMeta}>
                      Lv.{facility.level} / {definition !== undefined
                        ? formatFacilityProduction(definition, facility.level)
                        : ''}
                    </Text>
                  </View>
                  <Badge
                    label={facility.enabled ? '稼働中' : '停止中'}
                    tone={facility.enabled ? 'running' : 'neutral'}
                  />
                </Pressable>
              );
            })}
          </View>
        </Panel>

        {selected !== undefined && selectedDefinition !== undefined && (
          <Panel
            title={selectedDefinition.name}
            eyebrow="FACILITY / DETAIL"
            subtitle={selectedDefinition.description}
            accentColor={colors.secondary}
          >
            <View style={styles.detailRows}>
              <DetailRow
                label="現在の生産量"
                value={formatFacilityProduction(selectedDefinition, selected.level)}
              />
              <DetailRow
                label="レベル補正"
                value={`×${facilityLevelFactor(selected.level).toFixed(1)}`}
              />
              <DetailRow
                label="強化費用"
                value={`通貨 ${facilityUpgradeCost(selected.level)}`}
              />
              <DetailRow label="所持通貨" value={`${inventory.currency}`} />
            </View>
            <View style={styles.actions}>
              <GameButton
                label={
                  inventory.currency < facilityUpgradeCost(selected.level)
                    ? '通貨不足'
                    : `強化（通貨 ${facilityUpgradeCost(selected.level)}）`
                }
                disabled={inventory.currency < facilityUpgradeCost(selected.level)}
                onPress={() => {
                  const ok = upgradeFacility(selected.definitionId);
                  setFeedback(ok ? '施設を強化しました。' : '通貨が足りません。');
                }}
                style={styles.action}
              />
              <GameButton
                label={selected.enabled ? '稼働を停止' : '稼働を再開'}
                variant="secondary"
                onPress={() => {
                  toggleFacility(selected.definitionId);
                  setFeedback(null);
                }}
                style={styles.action}
              />
            </View>
            {feedback !== null && <Text style={styles.feedback}>{feedback}</Text>}
            <Text style={styles.note}>
              施設は作業中のみ生産します。停止中の施設は生産しません。
            </Text>
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
  content: screenContent,
  stats: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    ...shadows.soft,
  },
  cardSelected: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondarySoft,
  },
  pressed: {
    opacity: 0.8,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: withAlpha(colors.borderStrong, 0.55),
  },
  iconActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  iconText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  detailRows: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  detailValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
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
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
});
