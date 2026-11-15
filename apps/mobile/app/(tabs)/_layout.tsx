import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameHUD } from '../../src/components/GameHUD';
import { GameSidebar } from '../../src/components/GameSidebar';
import { StorageErrorBanner } from '../../src/components/StorageErrorBanner';
import { useMobileAppStore } from '../../src/stores/appStore';
import { colors } from '../../src/theme/tokens';

const SIDEBAR_BREAKPOINT = 768;

export default function TabsLayout() {
  const storageError = useMobileAppStore((s) => s.storageError);
  const { width } = useWindowDimensions();
  const docked = width >= SIDEBAR_BREAKPOINT;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (docked && sidebarOpen) setSidebarOpen(false);
  }, [docked, sidebarOpen]);

  return (
    <View style={[styles.root, docked ? styles.rootDocked : null]}>
      {docked && <GameSidebar docked />}
      <View style={styles.main}>
        <GameHUD onOpenNavigation={docked ? undefined : () => setSidebarOpen(true)} />
        {storageError !== null && <StorageErrorBanner message={storageError} />}
        <SafeAreaView edges={['bottom']} style={styles.tabs}>
          <Tabs
            tabBar={() => null}
            screenOptions={{
              headerShown: false,
              sceneStyle: styles.scene,
            }}
          >
            <Tabs.Screen name="index" options={{ title: '出撃' }} />
            <Tabs.Screen name="history" options={{ title: '履歴' }} />
            <Tabs.Screen name="base" options={{ title: '拠点' }} />
            <Tabs.Screen name="character" options={{ title: 'キャラクター' }} />
            <Tabs.Screen name="inventory" options={{ title: 'かばん' }} />
            <Tabs.Screen name="synthesis" options={{ title: '合成' }} />
          </Tabs>
        </SafeAreaView>
      </View>
      {!docked && (
        <GameSidebar
          docked={false}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  rootDocked: {
    flexDirection: 'row',
  },
  main: {
    flex: 1,
  },
  tabs: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scene: {
    backgroundColor: colors.background,
  },
});