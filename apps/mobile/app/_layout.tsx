import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameRuntime } from '../src/components/GameRuntime';
import { HydrationGate } from '../src/components/HydrationGate';
import { SupportToast } from '../src/components/SupportToast';
import { useMobileAppStore } from '../src/stores/appStore';

export default function RootLayout() {
  const hasHydrated = useMobileAppStore((s) => s.hasHydrated);
  const storageError = useMobileAppStore((s) => s.storageError);
  const hydrate = useMobileAppStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {hasHydrated ? (
        <View style={styles.root}>
          <GameRuntime />
          <Stack screenOptions={{ headerShown: false }} />
          <SupportToast />
        </View>
      ) : (
        <HydrationGate error={storageError} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
