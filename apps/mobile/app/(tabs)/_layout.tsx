import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { GameHUD } from '../../src/components/GameHUD';
import { GameTabBar } from '../../src/components/GameTabBar';
import { StorageErrorBanner } from '../../src/components/StorageErrorBanner';
import { useMobileAppStore } from '../../src/stores/appStore';
import { colors } from '../../src/theme/tokens';

export default function TabsLayout() {
  const storageError = useMobileAppStore((s) => s.storageError);

  return (
    <View style={styles.root}>
      <GameHUD />
      {storageError !== null && <StorageErrorBanner message={storageError} />}
      <Tabs
        tabBar={(props) => <GameTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: styles.scene,
        }}
      >
        <Tabs.Screen name="index" options={{ title: '出撃' }} />
        <Tabs.Screen name="base" options={{ title: '拠点' }} />
        <Tabs.Screen name="character" options={{ title: 'キャラクター' }} />
      </Tabs>
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
});
