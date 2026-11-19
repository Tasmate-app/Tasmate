import { useState } from 'react';
import { FlatList, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { mobileLicenseEntries } from '@tasmate/core/licenses';
import {
  Badge,
  GameButton,
  Panel,
  ScreenBackground,
  ScreenHeader,
  screenContent,
} from '../ui';
import { colors, fontSize, radius, shadows, spacing } from '../theme/tokens';

/** OSSライセンス一覧。直接・間接依存のサードパーティ製ライブラリを表示する */
export function LicensesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <ScreenBackground>
      <FlatList
        data={mobileLicenseEntries}
        keyExtractor={(entry) => `${entry.name}@${entry.version}`}
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.md + insets.top,
            paddingBottom: spacing.xxl + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader
              eyebrow="SETTINGS / LICENSES"
              title="OSSライセンス"
              subtitle="Tasmate が使用している直接・間接依存のサードパーティ製ライブラリです。"
              right={
                <GameButton
                  label="戻る"
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    router.canGoBack() ? router.back() : router.replace('/settings')
                  }
                />
              }
            />

            <Panel
              title={`使用ライブラリ（${mobileLicenseEntries.length}件）`}
              eyebrow="LICENSES"
              tone="accent"
            >
              <Text style={styles.note}>
                直接依存に加え、それらが依存するライブラリも掲載しています。
              </Text>
            </Panel>
          </View>
        }
        renderItem={({ item }) => {
          const key = `${item.name}@${item.version}`;
          const expanded = expandedKey === key;
          const repository = item.repository;
          return (
            <View style={styles.item}>
              <View style={styles.head}>
                <View style={styles.titleWrap}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.version}>v{item.version}</Text>
                </View>
                <Badge
                  label={item.license === 'UNKNOWN' ? '不明' : item.license}
                  tone="neutral"
                />
              </View>

              {repository !== null && (
                <GameButton
                  label="リポジトリを開く"
                  size="sm"
                  variant="ghost"
                  accessibilityLabel={`${item.name} のリポジトリを開く`}
                  onPress={() => {
                    void Linking.openURL(repository);
                  }}
                />
              )}

              {item.licenseText !== null ? (
                <>
                  <GameButton
                    label={expanded ? 'ライセンス全文を閉じる' : 'ライセンス全文を表示'}
                    size="sm"
                    variant="secondary"
                    accessibilityLabel={`${item.name} のライセンス全文を${expanded ? '閉じる' : '表示'}`}
                    onPress={() => setExpandedKey(expanded ? null : key)}
                  />
                  {expanded && (
                    <Text selectable style={styles.licenseText}>
                      {item.licenseText}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.note}>
                  ライセンス全文はパッケージに同梱されていません。リポジトリを参照してください。
                </Text>
              )}
            </View>
          );
        }}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: screenContent,
  header: {
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  item: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 6,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  version: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  licenseText: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    color: colors.textMuted,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
});
