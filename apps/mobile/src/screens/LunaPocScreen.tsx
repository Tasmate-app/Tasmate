import { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LunaScene } from '../game3d/LunaScene';
import { previewReward, SHARED_RULE_LABEL } from '../logic/sharedGameLogic';

type LoadState = 'loading' | 'ready' | 'error';

const rewardPreview = previewReward(25);

export function LunaPocScreen() {
  const [selected, setSelected] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [glReady, setGlReady] = useState(false);
  const [fps, setFps] = useState<number | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const toggleSelected = useCallback(() => {
    setSelected((current) => !current);
  }, []);

  const handleModelReady = useCallback(() => {
    setLoadState('ready');
  }, []);

  const handleModelError = useCallback(() => {
    setLoadState('error');
  }, []);

  const handleContextReady = useCallback(() => {
    setGlReady(true);
  }, []);

  const handleFps = useCallback((value: number) => {
    setFps(value);
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width: Math.round(width), height: Math.round(height) });
  }, []);

  const modelLabel =
    loadState === 'ready' ? 'Luna GLB ready' : loadState === 'error' ? 'GLB load failed' : 'Loading Luna GLB';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>TASMATE / PHASE B</Text>
        <Text style={styles.title}>Native 3D PoC</Text>
        <Text style={styles.subtitle}>Expo GL + React Three Fiber + Luna GLB</Text>
      </View>

      <View style={styles.canvasFrame} onLayout={handleLayout}>
        <LunaScene
          selected={selected}
          onToggleSelected={toggleSelected}
          onModelReady={handleModelReady}
          onModelError={handleModelError}
          onContextReady={handleContextReady}
          onFps={handleFps}
        />
        <View style={styles.canvasBadge}>
          <View style={[styles.badgeDot, glReady ? styles.badgeDotReady : null]} />
          <Text style={styles.canvasBadgeText}>{modelLabel}</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, selected ? styles.statusDotSelected : null]} />
          <View style={styles.statusTextGroup}>
            <Text style={styles.statusLabel}>選択状態</Text>
            <Text style={styles.statusValue}>{selected ? 'ルナを選択中' : '未選択'}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ルナの選択を切り替える"
            onPress={toggleSelected}
            style={({ pressed }) => [
              styles.toggleButton,
              selected ? styles.toggleButtonActive : null,
              pressed ? styles.toggleButtonPressed : null,
            ]}
          >
            <Text style={[styles.toggleButtonText, selected ? styles.toggleButtonTextActive : null]}>
              {selected ? '解除' : '選択'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          3Dのルナをタップすると選択できます。固定カメラのため、ドラッグでは回転しません。
        </Text>

        <Text style={styles.sharedLogic}>
          Shared core: 25分で {rewardPreview.currency}C / {rewardPreview.materials}素材 /{' '}
          {rewardPreview.experience}EXP（{SHARED_RULE_LABEL}）
        </Text>

        <View style={styles.metricsRow}>
          <Metric label="GL" value={glReady ? 'ready' : '--'} />
          <Metric label="モデル" value={loadState === 'ready' ? '読込済み' : loadState === 'error' ? '失敗' : '読込中'} />
          <Metric label="FPS" value={fps === null ? '--' : String(fps)} />
          <Metric label="Canvas" value={viewport.width > 0 ? `${viewport.width}×${viewport.height}` : '--'} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef8ff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  eyebrow: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  canvasFrame: {
    flex: 1,
    minHeight: 260,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#e7f6ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  canvasBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  badgeDotReady: {
    backgroundColor: '#10b981',
  },
  canvasBadgeText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
  },
  panel: {
    margin: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#cbd5e1',
  },
  statusDotSelected: {
    backgroundColor: '#06b6d4',
  },
  statusTextGroup: {
    flex: 1,
  },
  statusLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  statusValue: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 1,
  },
  toggleButton: {
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  toggleButtonActive: {
    backgroundColor: '#0891b2',
  },
  toggleButtonPressed: {
    opacity: 0.75,
  },
  toggleButtonText: {
    color: '#0369a1',
    fontSize: 13,
    fontWeight: '800',
  },
  toggleButtonTextActive: {
    color: '#ffffff',
  },
  hint: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  sharedLogic: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    flexGrow: 1,
    minWidth: 68,
    borderRadius: 12,
    backgroundColor: '#f1f9ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
});
