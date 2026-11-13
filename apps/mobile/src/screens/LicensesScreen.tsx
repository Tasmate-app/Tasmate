import { useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { mobileLicenseEntries } from '@tasmate/core/licenses';
import {
  Badge,
  GameButton,
  Panel,
  ScreenBackground,
  ScreenHeader,
} from '../ui';
import { colors, fontSize, radius, spacing } from '../theme/tokens';

/** OSSライセンス一覧。直接依存しているサードパーティ製ライブラリを表示する */
export function LicensesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.md + insets.top,
            paddingBottom: spacing.xxl + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="SETTINGS / LICENSES"
          title="OSSライセンス"
          subtitle="Tasmate が使用している直接依存のサードパーティ製ライブラリです。"
          right={
            <GameButton
              label="戻る"
              size="sm"
              variant="secondary"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
            />
          }
        />

        <Panel
          title={`使用ライブラリ（${mobileLicenseEntries.length}件）`}
          eyebrow="LICENSES"
          tone="accent"
        >
          {mobileLicenseEntries.map((entry, index) => {
            const key = `${entry.name}@${entry.version}`;
            const expanded = expandedKey === key;
            const repository = entry.repository;
            const isLast = index === mobileLicenseEntries.length - 1;
            return (
              <View key={key} style={[styles.item, isLast && styles.itemLast]}>
                <View style={styles.head}>
                  <View style={styles.titleWrap}>
                    <Text style={styles.name}>{entry.name}</Text>
                    <Text style={styles.version}>v{entry.version}</Text>
                  </View>
                  <Badge label={entry.license} tone="neutral" />
                </View>

                {repository !== null && (
                  <GameButton
                    label="リポジトリを開く"
                    size="sm"
                    variant="ghost"
                    accessibilityLabel={`${entry.name} のリポジトリを開く`}
                    onPress={() => {
                      void Linking.openURL(repository);
                    }}
                  />
                )}

                {entry.licenseText !== null ? (
                  <>
                    <GameButton
                      label={expanded ? 'ライセンス全文を閉じる' : 'ライセンス全文を表示'}
                      size="sm"
                      variant="secondary"
                      accessibilityLabel={`${entry.name} のライセンス全文を${expanded ? '閉じる' : '表示'}`}
                      onPress={() => setExpandedKey(expanded ? null : key)}
                    />
                    {expanded && (
                      <Text selectable style={styles.licenseText}>
                        {entry.licenseText}
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
          })}
        </Panel>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  item: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderStyle: 'dashed',
  },
  itemLast: {
    paddingBottom: 0,
    borderBottomWidth: 0,
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
