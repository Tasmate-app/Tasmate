import { describe, expect, it } from 'vitest';
import { createAppStore, type TaskInput } from '../src/store';
import { initialAppState } from '../src/appState';
import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  clearAppStateFromStorage,
  createAsyncStorageAdapter,
  loadAppStateFromStorage,
  parseStoredAppState,
} from '../src/storage';

function taskInput(title: string): TaskInput {
  return {
    title,
    description: '',
    category: '勉強',
    estimatedMinutes: 25,
  };
}

function createMemoryStorage(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));
  const writes: string[] = [];
  let activeWrites = 0;
  let maxActiveWrites = 0;
  let attempts = 0;
  let reads = 0;
  let delayMs = 0;
  let shouldFail = false;
  let shouldFailRead = false;

  const adapter = {
    async getItem(key: string): Promise<string | null> {
      reads += 1;
      if (shouldFailRead) throw new Error('read failed');
      return data.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      attempts += 1;
      activeWrites += 1;
      maxActiveWrites = Math.max(maxActiveWrites, activeWrites);
      try {
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        if (shouldFail) throw new Error('write failed');
        data.set(key, value);
        writes.push(value);
      } finally {
        activeWrites -= 1;
      }
    },
    async removeItem(key: string): Promise<void> {
      data.delete(key);
    },
  };

  return {
    adapter,
    data,
    writes,
    get maxActiveWrites() {
      return maxActiveWrites;
    },
    get attempts() {
      return attempts;
    },
    get reads() {
      return reads;
    },
    setDelay(value: number) {
      delayMs = value;
    },
    failWrites() {
      shouldFail = true;
    },
    allowWrites() {
      shouldFail = false;
    },
    failReads() {
      shouldFailRead = true;
    },
  };
}

describe('shared app store persistence', () => {
  it('hydrates saved state without immediately writing it back', async () => {
    const persisted = {
      ...initialAppState(),
      inventory: { ...initialAppState().inventory, currency: 777 },
    };
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(persisted) });
    const store = createAppStore({ storage: storage.adapter, saveDebounceMs: 0 });

    expect(store.getState().hasHydrated).toBe(false);
    await store.getState().hydrate();

    expect(store.getState().hasHydrated).toBe(true);
    expect(store.getState().inventory.currency).toBe(777);
    await store.getState().flush();
    expect(storage.writes).toHaveLength(0);
  });

  it('does not save changes made before hydration', async () => {
    const storage = createMemoryStorage();
    const store = createAppStore({ storage: storage.adapter, saveDebounceMs: 0 });

    store.getState().createTask(taskInput('before hydration'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(storage.writes).toHaveLength(0);
    await store.getState().hydrate();
    expect(store.getState().hasHydrated).toBe(true);
  });

  it('saves only the persisted fields in the existing JSON format', async () => {
    const storage = createMemoryStorage();
    const store = createAppStore({ storage: storage.adapter, saveDebounceMs: 0 });
    await store.getState().hydrate();

    store.getState().createTask(taskInput('saved task'));
    await store.getState().flush();

    expect(storage.writes).toHaveLength(1);
    const saved = JSON.parse(storage.writes[0]) as Record<string, unknown>;
    expect(saved['version']).toBe(1);
    expect(Array.isArray(saved['tasks'])).toBe(true);
    expect(saved['hasHydrated']).toBeUndefined();
    expect(saved['storageError']).toBeUndefined();
    expect(saved['createTask']).toBeUndefined();
    expect((saved['tasks'] as Array<{ title: string }>)[0]?.title).toBe('saved task');
  });

  it('serializes writes so an older snapshot cannot overwrite a newer one', async () => {
    const storage = createMemoryStorage();
    const store = createAppStore({ storage: storage.adapter, saveDebounceMs: 0 });
    await store.getState().hydrate();
    storage.setDelay(10);

    store.getState().createTask(taskInput('first'));
    const firstFlush = store.getState().flush();
    store.getState().createTask(taskInput('second'));
    const secondFlush = store.getState().flush();

    await Promise.all([firstFlush, secondFlush]);
    expect(storage.maxActiveWrites).toBe(1);
    const saved = JSON.parse(storage.writes[storage.writes.length - 1]) as {
      tasks: Array<{ title: string }>;
    };
    expect(saved.tasks.map((task) => task.title)).toEqual(['second', 'first']);
  });

  it('does not persist a snapshot that was undone before the debounce fires', async () => {
    const storage = createMemoryStorage();
    const store = createAppStore({ storage: storage.adapter, saveDebounceMs: 20 });
    await store.getState().hydrate();

    store.getState().createTask(taskInput('base'));
    await store.getState().flush();
    const saved = storage.writes[storage.writes.length - 1];

    store.getState().toggleFacility('f-coin');
    store.getState().toggleFacility('f-coin');
    await store.getState().flush();

    expect(storage.writes[storage.writes.length - 1]).toBe(saved);
  });

  it('saves the reverted state after an in-flight write finishes', async () => {
    const storage = createMemoryStorage();
    const store = createAppStore({ storage: storage.adapter, saveDebounceMs: 20 });
    await store.getState().hydrate();

    store.getState().createTask(taskInput('base'));
    await store.getState().flush();
    const saved = storage.writes[storage.writes.length - 1];
    storage.setDelay(20);

    store.getState().toggleFacility('f-coin');
    const firstFlush = store.getState().flush();
    await new Promise((resolve) => setTimeout(resolve, 5));
    store.getState().toggleFacility('f-coin');
    const secondFlush = store.getState().flush();

    await Promise.all([firstFlush, secondFlush]);
    expect(storage.writes[storage.writes.length - 1]).toBe(saved);
  });

  it('retries a failed write on flush', async () => {
    const storage = createMemoryStorage();
    const store = createAppStore({ storage: storage.adapter, saveDebounceMs: 0 });
    await store.getState().hydrate();
    storage.failWrites();

    store.getState().createTask(taskInput('fails'));
    await store.getState().flush();

    expect(store.getState().storageError).toBe('write failed');
    expect(storage.attempts).toBe(2);
    expect(storage.writes).toHaveLength(0);

    storage.allowWrites();
    await store.getState().flush();

    expect(storage.writes).toHaveLength(1);
    expect(store.getState().storageError).toBeNull();
  });

  it('does not overwrite existing data when the storage read fails', async () => {
    const raw = JSON.stringify({
      ...initialAppState(),
      inventory: { ...initialAppState().inventory, currency: 777 },
    });
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw });
    storage.failReads();
    const store = createAppStore({ storage: storage.adapter, saveDebounceMs: 0 });

    await store.getState().hydrate();

    expect(store.getState().hasHydrated).toBe(true);
    expect(store.getState().storageError).not.toBeNull();

    store.getState().createTask(taskInput('must not overwrite'));
    await store.getState().flush();

    expect(storage.writes).toHaveLength(0);
    expect(storage.data.get(STORAGE_KEY)).toBe(raw);
  });

  it('migrates legacy storage key to the current key', async () => {
    const legacy = {
      ...initialAppState(),
      inventory: { ...initialAppState().inventory, currency: 42 },
    };
    const storage = createMemoryStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify(legacy) });

    const result = await loadAppStateFromStorage(storage.adapter);

    expect(result.migratedFromLegacy).toBe(true);
    expect(result.state?.inventory.currency).toBe(42);
    expect(storage.data.has(LEGACY_STORAGE_KEY)).toBe(false);
    expect(storage.data.has(STORAGE_KEY)).toBe(true);
  });

  it('keeps running with initial state when saved JSON is corrupt', async () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: '{not json' });
    const store = createAppStore({ storage: storage.adapter, saveDebounceMs: 0 });

    await store.getState().hydrate();

    expect(store.getState().hasHydrated).toBe(true);
    expect(store.getState().storageError).not.toBeNull();
    expect(store.getState().tasks).toHaveLength(0);
  });

  it('wraps an AsyncStorage-like object and clears both keys', async () => {
    const values = new Map<string, string>([
      [STORAGE_KEY, 'current'],
      [LEGACY_STORAGE_KEY, 'legacy'],
    ]);
    const adapter = createAsyncStorageAdapter({
      async getItem(key) {
        return values.get(key) ?? null;
      },
      async setItem(key, value) {
        values.set(key, value);
      },
      async removeItem(key) {
        values.delete(key);
      },
    });

    expect(await adapter.getItem(STORAGE_KEY)).toBe('current');
    await adapter.setItem(STORAGE_KEY, 'updated');
    expect(await adapter.getItem(STORAGE_KEY)).toBe('updated');

    await clearAppStateFromStorage(adapter);
    expect(values.size).toBe(0);
  });

  it('rejects malformed saved data', () => {
    expect(parseStoredAppState('{')).toBeNull();
    expect(parseStoredAppState(JSON.stringify({ version: 1 }))).toBeNull();
  });
});
