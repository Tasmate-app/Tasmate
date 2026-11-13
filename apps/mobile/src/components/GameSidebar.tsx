import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { visibleNavigationItems } from '@tasmate/core';
import { MOBILE_NAV_META, type MobileNavItemMeta } from '../features/navigation/navItems';
import { useMobileAppStore } from '../stores/appStore';
import {
  colors,
  fontSize,
  radius,
  shadows,
  spacing,
  withAlpha,
} from '../theme/tokens';

const DOCKED_WIDTH = 248;
const MIN_OVERLAY_WIDTH = 264;
const MAX_OVERLAY_WIDTH = 340;

interface GameSidebarProps {
  docked: boolean;
  open?: boolean;
  onClose?: () => void;
}

interface SidebarContentProps {
  pathname: string;
  items: MobileNavItemMeta[];
  showClose: boolean;
  onNavigate: (href: MobileNavItemMeta['href']) => void;
  onEdit: () => void;
  onClose?: () => void;
}

function SidebarContent({
  pathname,
  items,
  showClose,
  onNavigate,
  onEdit,
  onClose,
}: SidebarContentProps) {
  return (
    <View style={styles.content}>
      <View style={styles.brandRow}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.brandMark}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.brandText}>
          <Text style={styles.brandWord}>Tasmate</Text>
          <Text style={styles.brandSub}>STUDY QUEST / MENU</Text>
        </View>
        {showClose && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="メニューを閉じる"
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.closeGlyph}>×</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.sectionRow}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionLabel}>メインメニュー</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.itemList}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}（${item.dish}）`}
              accessibilityState={{ selected: active }}
              onPress={() => onNavigate(item.href)}
              style={({ pressed }) => [
                styles.item,
                active ? styles.itemActive : null,
                pressed ? styles.pressed : null,
              ]}
            >
              {active && <View style={styles.activeBar} />}
              <View style={[styles.iconWrap, active ? styles.iconWrapActive : null]}>
                <Text style={[styles.glyph, active ? styles.glyphActive : null]}>
                  {item.glyph}
                </Text>
              </View>
              <View style={styles.labelWrap}>
                <Text
                  style={[styles.label, active ? styles.labelActive : null]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Text
                  style={[styles.dish, active ? styles.dishActive : null]}
                  numberOfLines={1}
                >
                  {item.dish}
                </Text>
              </View>
              <Text style={[styles.chevron, active ? styles.chevronActive : null]}>›</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="サイドバーの表示項目を編集"
          onPress={onEdit}
          style={({ pressed }) => [styles.editButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.editGlyph}>✎</Text>
          <Text style={styles.editLabel}>表示を編集</Text>
        </Pressable>
        <Text style={styles.footerNote}>
          表示する項目と順番は設定から変更できます。
        </Text>
      </View>
    </View>
  );
}

export function GameSidebar({ docked, open = false, onClose }: GameSidebarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const navigationItems = useMobileAppStore((s) => s.settings.navigationItems);

  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const items = useMemo(
    () =>
      visibleNavigationItems(navigationItems).map((item) => MOBILE_NAV_META[item.id]),
    [navigationItems],
  );

  useEffect(() => {
    if (docked) return;
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? 240 : 180,
      useNativeDriver: true,
    }).start();
  }, [docked, open, progress]);

  useEffect(() => {
    if (docked || !open) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose?.();
      return true;
    });
    return () => subscription.remove();
  }, [docked, onClose, open]);

  const handleNavigate = (href: MobileNavItemMeta['href']) => {
    onClose?.();
    router.navigate(href);
  };

  const handleEdit = () => {
    onClose?.();
    router.push('/settings');
  };

  if (docked) {
    return (
      <View
        style={[
          styles.docked,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <SidebarContent
          pathname={pathname}
          items={items}
          showClose={false}
          onNavigate={handleNavigate}
          onEdit={handleEdit}
        />
      </View>
    );
  }

  const panelWidth = Math.min(
    MAX_OVERLAY_WIDTH,
    Math.max(MIN_OVERLAY_WIDTH, width * 0.82),
  );
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-panelWidth, 0],
  });
  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={open ? 'box-none' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="メニューを閉じる"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal={open}
        style={[
          styles.panel,
          {
            width: panelWidth,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            transform: [{ translateX }],
          },
        ]}
      >
        <View pointerEvents="none" style={styles.panelSheen} />
        <SidebarContent
          pathname={pathname}
          items={items}
          showClose
          onNavigate={handleNavigate}
          onEdit={handleEdit}
          onClose={onClose}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  docked: {
    width: DOCKED_WIDTH,
    backgroundColor: colors.surfaceGlassStrong,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.surfaceGlassStrong,
    borderTopRightRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    borderRightWidth: 1,
    borderRightColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
    ...shadows.floating,
  },
  panelSheen: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primaryPale,
  },
  backdrop: {
    backgroundColor: colors.overlay,
  },
  content: {
    flex: 1,
    gap: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  brandText: {
    flex: 1,
    gap: 1,
  },
  brandWord: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  brandSub: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  closeGlyph: {
    color: colors.primaryDark,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 22,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  sectionLabel: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  scroll: {
    flex: 1,
  },
  itemList: {
    gap: 6,
    paddingVertical: spacing.xs,
  },
  item: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.985 }],
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
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
    flex: 1,
    gap: 1,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  labelActive: {
    color: colors.primaryDark,
  },
  dish: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
  },
  dishActive: {
    color: colors.primary,
  },
  chevron: {
    color: colors.textSubtle,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  chevronActive: {
    color: colors.primary,
  },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
  },
  editGlyph: {
    color: colors.primaryDark,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  editLabel: {
    color: colors.primaryDark,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  footerNote: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 15,
    textAlign: 'center',
  },
});