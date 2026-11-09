import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { colors, fontSize, radius, shadows, spacing, withAlpha } from '../theme/tokens';

const TAB_META: Record<string, { label: string; glyph: string; dish: string }> = {
  index: { label: '出撃', glyph: '◈', dish: 'クエスト' },
  history: { label: '履歴', glyph: '◷', dish: '作業ログ' },
  base: { label: '拠点', glyph: '⌂', dish: 'シェアハウス' },
  character: { label: 'キャラ', glyph: '✦', dish: '仲間' },
  inventory: { label: 'かばん', glyph: '✧', dish: '所持品' },
};

export function GameTabBar({ state, descriptors, navigateToTab, insets }: BottomTabBarProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name] ?? {
            label: descriptors[route.key]?.options.title ?? route.name,
            glyph: '◇',
            dish: '',
          };
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={meta.label}
              accessibilityState={{ selected: focused }}
              onPress={() => navigateToTab(route.key)}
              style={({ pressed }) => [
                styles.item,
                focused ? styles.itemActive : null,
                pressed ? styles.pressed : null,
              ]}
            >
              {focused && <View style={styles.activeGlow} />}
              <View style={[styles.iconWrap, focused ? styles.iconWrapActive : null]}>
                <Text style={[styles.glyph, focused ? styles.glyphActive : null]}>
                  {meta.glyph}
                </Text>
              </View>
              <View style={styles.labelWrap}>
                <Text style={[styles.label, focused ? styles.labelActive : null]}>
                  {meta.label}
                </Text>
                <Text style={[styles.dish, focused ? styles.dishActive : null]} numberOfLines={1}>
                  {meta.dish}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    backgroundColor: colors.background,
  },
  bar: {
    flexDirection: 'row',
    gap: 4,
    padding: 5,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceGlassStrong,
    ...shadows.floating,
  },
  item: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.lg,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  itemActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  activeGlow: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    top: 0,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: withAlpha(colors.borderStrong, 0.55),
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    ...shadows.glow,
  },
  glyph: {
    color: colors.navInactive,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  glyphActive: {
    color: colors.white,
  },
  labelWrap: {
    gap: 0,
  },
  label: {
    color: colors.navInactive,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: colors.primaryDark,
  },
  dish: {
    color: colors.textSubtle,
    fontSize: 7,
    fontWeight: '700',
  },
  dishActive: {
    color: colors.primary,
  },
});
