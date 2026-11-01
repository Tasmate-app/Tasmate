import { StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { GameHUD } from '../../src/components/GameHUD';
import { StorageErrorBanner } from '../../src/components/StorageErrorBanner';
import { useMobileAppStore } from '../../src/stores/appStore';
import { colors, fontSize, radius, shadows } from '../../src/theme/tokens';

export default function TabsLayout() {
  const storageError = useMobileAppStore((s) => s.storageError);

  return (
    <View style={styles.root}>
      <GameHUD />
      {storageError !== null && <StorageErrorBanner message={storageError} />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primaryDark,
          tabBarInactiveTintColor: colors.textSubtle,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
          sceneStyle: styles.scene,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: '出撃',
            tabBarIcon: ({ focused }) => <TabIcon label="出" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="base"
          options={{
            title: '拠点',
            tabBarIcon: ({ focused }) => <TabIcon label="拠" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="character"
          options={{
            title: 'キャラクター',
            tabBarIcon: ({ focused }) => <TabIcon label="仲" focused={focused} />,
          }}
        />
      </Tabs>
    </View>
  );
}

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={[styles.icon, focused ? styles.iconFocused : null]}>
      <Text style={[styles.iconText, focused ? styles.iconTextFocused : null]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scene: {
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 70,
    paddingTop: 6,
    paddingBottom: 8,
    ...shadows.card,
  },
  tabItem: {
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  iconFocused: {
    backgroundColor: colors.primary,
  },
  iconText: {
    color: colors.textSubtle,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  iconTextFocused: {
    color: colors.white,
  },
});
