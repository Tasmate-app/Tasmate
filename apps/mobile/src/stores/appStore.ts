import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAppStore, createAsyncStorageAdapter } from '@tasmate/core';

/** Native用のストレージアダプタ。Web版と同じキー・JSON構造を使う */
export const mobileStorageAdapter = createAsyncStorageAdapter(AsyncStorage);

export const useMobileAppStore = createAppStore({
  storage: mobileStorageAdapter,
});
