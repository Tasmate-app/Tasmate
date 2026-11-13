import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PINNED_MOBILE_NAV_ITEM_ID } from '@tasmate/core';
import { useMobileAppStore } from '../../stores/appStore';
import { GameButton, Panel } from '../../ui';
import { colors, fontSize, radius, spacing, withAlpha } from '../../theme/tokens';
import { MOBILE_NAV_META } from './navItems';

export function SidebarSettingsPanel() {
  const navigationItems = useMobileAppStore((s) => s.settings.navigationItems);
  const setNavigationItemVisible = useMobileAppStore((s) => s.setNavigationItemVisible);
  const moveNavigationItem = useMobileAppStore((s) => s.moveNavigationItem);
  const resetNavigationItems = useMobileAppStore((s) => s.resetNavigationItems);

  return (
    <Panel
      title="サイドバー"
      eyebrow="NAVIGATION"
      subtitle="表示する項目と並び順を変更できます。出撃は常に表示されます。"
      tone="secondary"
    >
      <View style={styles.list}>
        {navigationItems.map((item, index) => {
          const meta = MOBILE_NAV_META[item.id];
          const pinned = item.id === PINNED_MOBILE_NAV_ITEM_ID;
          return (
            <View
              key={item.id}
              style={[styles.row, item.visible ? null : styles.rowHidden]}
            >
              <View
                style={[
                  styles.glyphBox,
                  item.visible ? styles.glyphBoxVisible : null,
                ]}
              >
                <Text
                  style={[
                    styles.glyph,
                    item.visible ? styles.glyphVisible : null,
                  ]}
                >
                  {meta.glyph}
                </Text>
              </View>

              <View style={styles.textWrap}>
                <Text style={styles.label} numberOfLines={1}>
                  {meta.label}
                </Text>
                <Text style={styles.dish} numberOfLines={1}>
                  {meta.dish}
                </Text>
              </View>

              <View style={styles.actions}>
                <MoveButton
                  direction="up"
                  label={meta.label}
                  disabled={index === 0}
                  onPress={() => moveNavigationItem(item.id, 'up')}
                />
                <MoveButton
                  direction="down"
                  label={meta.label}
                  disabled={index === navigationItems.length - 1}
                  onPress={() => moveNavigationItem(item.id, 'down')}
                />
                {pinned ? (
                  <View style={styles.pinnedBadge}>
                    <Text style={styles.pinnedText}>固定</Text>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="switch"
                    accessibilityLabel={`${meta.label}を表示`}
                    accessibilityState={{ checked: item.visible }}
                    onPress={() => setNavigationItemVisible(item.id, !item.visible)}
                    style={({ pressed }) => [
                      styles.toggle,
                      item.visible ? styles.toggleOn : styles.toggleOff,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        item.visible ? styles.toggleTextOn : styles.toggleTextOff,
                      ]}
                    >
                      {item.visible ? '表示' : '非表示'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <GameButton
        label="初期配置に戻す"
        variant="secondary"
        size="sm"
        onPress={resetNavigationItems}
      />
      <Text style={styles.note}>
        非表示にした画面も、アプリ内のリンクからは引き続き開けます。
      </Text>
    </Panel>
  );
}

function MoveButton({
  direction,
  label,
  disabled,
  onPress,
}: {
  direction: 'up' | 'down';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}を${direction === 'up' ? '上' : '下'}へ移動`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.moveButton,
        disabled ? styles.moveButtonDisabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.moveGlyph, disabled ? styles.moveGlyphDisabled : null]}>
        {direction === 'up' ? '▲' : '▼'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  rowHidden: {
    opacity: 0.62,
    borderStyle: 'dashed',
  },
  glyphBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: withAlpha(colors.borderStrong, 0.55),
  },
  glyphBoxVisible: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  glyph: {
    color: colors.textSubtle,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  glyphVisible: {
    color: colors.white,
  },
  textWrap: {
    flex: 1,
    gap: 1,
  },
  label: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  dish: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moveButton: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  moveButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  moveGlyph: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '900',
  },
  moveGlyphDisabled: {
    color: colors.textSubtle,
  },
  toggle: {
    minWidth: 48,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
  },
  toggleOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong,
  },
  toggleOff: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '900',
  },
  toggleTextOn: {
    color: colors.primaryDark,
  },
  toggleTextOff: {
    color: colors.textSubtle,
  },
  pinnedBadge: {
    minWidth: 48,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  pinnedText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
});