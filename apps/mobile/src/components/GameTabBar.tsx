import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { colors, fontSize, radius, shadows } from '../theme/tokens';

const TAB_META: Record<string, { label: string; glyph: string }> = {
  index: { label: '出撃', glyph: '◈' },
  base: { label: '拠点', glyph: '⌂' },
  character: { label: 'キャラ', glyph: '✦' },
};

export function GameTabBar({ state, descriptors, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name] ?? {
            label: descriptors[route.key]?.options.title ?? route.name,
            glyph: '◇',
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
              <View style={[styles.iconWrap, focused ? styles.iconWrapActive : null]}>
                <Text style={[styles.glyph, focused ? styles.glyphActive : null]}>
                  {meta.glyph}
                </Text>
              </View>
              <Text style={[styles.label, focused ? styles.labelActive : null]}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
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
    backgroundColor: colors.surface,
    ...shadows.floating,
  },
  item: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.lg,
    paddingHorizontal: 6,
  },
  itemActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  pressed: {
    opacity: 0.78,
  },
  iconWrap: {
    width: 25,
    height: 25,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  glyph: {
    color: colors.navInactive,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  glyphActive: {
    color: colors.white,
  },
  label: {
    color: colors.navInactive,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: colors.primaryDark,
  },
});
