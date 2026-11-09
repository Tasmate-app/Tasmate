import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { HistoryGranularity } from '@tasmate/types';
import {
  aggregateByCategory,
  aggregateBySubCategory,
  buildHistoryEntries,
  buildTimeSeries,
  computeWorkTimeTotals,
  filterHistoryEntries,
  formatWorkDuration,
  toDateKey,
} from '@tasmate/core';
import { useMobileAppStore } from '../stores/appStore';
import {
  Badge,
  ChipGroup,
  EmptyState,
  GameButton,
  Panel,
  ProgressBar,
  ScreenBackground,
  ScreenHeader,
  SegmentedControl,
  StatTile,
} from '../ui';
import { colors, fontSize, radius, spacing } from '../theme/tokens';

const GRANULARITY_OPTIONS = [
  { value: 'day', label: '日' },
  { value: 'week', label: '週' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
];

const GRANULARITY_COUNT: Record<HistoryGranularity, number> = {
  day: 7,
  week: 8,
  month: 6,
  year: 5,
};

function formatEntryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BreakdownRow({
  name,
  seconds,
  ratio,
  archived,
}: {
  name: string;
  seconds: number;
  ratio: number;
  archived: boolean;
}) {
  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownHead}>
        <Text style={styles.breakdownName} numberOfLines={1}>
          {name}
          {archived ? '（削除済み）' : ''}
        </Text>
        <Text style={styles.breakdownValue}>{formatWorkDuration(seconds)}</Text>
      </View>
      <ProgressBar value={ratio * 100} height={8} color={colors.primary} />
      <Text style={styles.breakdownMeta}>全体の {Math.round(ratio * 100)}%</Text>
    </View>
  );
}

export function HistoryScreen() {
  const router = useRouter();
  const sessionHistory = useMobileAppStore((s) => s.sessionHistory);
  const tasks = useMobileAppStore((s) => s.tasks);
  const categories = useMobileAppStore((s) => s.categories);
  const subCategories = useMobileAppStore((s) => s.subCategories);

  const [granularity, setGranularity] = useState<HistoryGranularity>('day');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subCategoryFilter, setSubCategoryFilter] = useState('');

  const entries = useMemo(
    () => buildHistoryEntries(sessionHistory, tasks, categories, subCategories),
    [sessionHistory, tasks, categories, subCategories],
  );
  const totals = useMemo(() => computeWorkTimeTotals(entries), [entries]);

  const filteredEntries = useMemo(() => {
    const subCategoryId =
      subCategoryFilter === ''
        ? undefined
        : subCategoryFilter === '__none__'
          ? null
          : subCategoryFilter;
    return filterHistoryEntries(entries, {
      categoryId: categoryFilter === '' ? undefined : categoryFilter,
      subCategoryId,
    });
  }, [entries, categoryFilter, subCategoryFilter]);

  const series = useMemo(
    () =>
      buildTimeSeries(
        filteredEntries,
        granularity,
        toDateKey(new Date()),
        GRANULARITY_COUNT[granularity],
      ),
    [filteredEntries, granularity],
  );
  const maxSeriesSeconds = Math.max(1, ...series.map((point) => point.seconds));
  const categoryTotals = useMemo(() => aggregateByCategory(filteredEntries), [filteredEntries]);
  const subCategoryTotals = useMemo(
    () => aggregateBySubCategory(filteredEntries),
    [filteredEntries],
  );
  const categoryOptions = categories.filter(
    (category) => category.id === categoryFilter || category.archivedAt === undefined,
  );
  const subCategoryOptions = subCategories.filter((sub) => sub.categoryId === categoryFilter);
  const visibleEntries = filteredEntries.slice(0, 100);

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="HISTORY / WORK LOG"
          title="履歴"
          subtitle="実際に作業した時間を集計します。一時停止中は含みません。"
          right={
            <GameButton
              label="分類管理"
              size="sm"
              variant="secondary"
              onPress={() => router.push('/categories')}
            />
          }
        />

        <View style={styles.stats}>
          <StatTile label="今日" value={formatWorkDuration(totals.today)} glyph="◈" />
          <StatTile
            label="今週"
            value={formatWorkDuration(totals.week)}
            glyph="▦"
            tone={colors.primaryDark}
          />
          <StatTile
            label="今月"
            value={formatWorkDuration(totals.month)}
            glyph="✦"
            tone={colors.secondary}
          />
          <StatTile label="累計" value={formatWorkDuration(totals.total)} glyph="∞" />
        </View>

        <Panel title="作業時間の推移" eyebrow="TIMELINE" tone="primary">
          <SegmentedControl
            options={GRANULARITY_OPTIONS}
            value={granularity}
            onChange={(value) => setGranularity(value as HistoryGranularity)}
          />
          <View style={styles.chart}>
            {series.map((point) => (
              <View key={point.key} style={styles.chartColumn}>
                <View style={styles.chartTrack}>
                  <View
                    style={[
                      styles.chartBar,
                      point.seconds === 0 ? styles.chartBarEmpty : null,
                      {
                        height: `${Math.max(2, (point.seconds / maxSeriesSeconds) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel} numberOfLines={1}>
                  {point.label}
                </Text>
                <Text style={styles.chartValue} numberOfLines={1}>
                  {formatWorkDuration(point.seconds)}
                </Text>
              </View>
            ))}
          </View>
          {filteredEntries.length === 0 && (
            <Text style={styles.emptyNote}>この条件の作業履歴はまだありません。</Text>
          )}
        </Panel>

        <Panel title="カテゴリー別" eyebrow="CATEGORY BREAKDOWN">
          <ChipGroup
            options={[
              { value: '', label: 'すべて' },
              ...categoryOptions.map((category) => ({
                value: category.id,
                label: `${category.name}${category.archivedAt !== undefined ? '（削除済み）' : ''}`,
              })),
            ]}
            selected={[categoryFilter]}
            onToggle={(value) => {
              setCategoryFilter(value);
              setSubCategoryFilter('');
            }}
            accessibilityLabel="カテゴリーで絞り込む"
          />
          <View style={styles.breakdown}>
            {categoryTotals.length === 0 ? (
              <Text style={styles.emptyNote}>集計できる作業時間がありません。</Text>
            ) : (
              categoryTotals.map((item) => (
                <BreakdownRow
                  key={item.categoryId ?? item.categoryName}
                  name={item.categoryName}
                  seconds={item.seconds}
                  ratio={item.ratio}
                  archived={item.archived}
                />
              ))
            )}
          </View>
        </Panel>

        <Panel title="サブカテゴリー別" eyebrow="SUB CATEGORY BREAKDOWN" tone="secondary">
          {categoryFilter === '' ? (
            <Text style={styles.emptyNote}>
              カテゴリーを選ぶとサブカテゴリーで絞り込めます。
            </Text>
          ) : (
            <ChipGroup
              options={[
                { value: '', label: 'すべて' },
                { value: '__none__', label: '未分類' },
                ...subCategoryOptions.map((sub) => ({
                  value: sub.id,
                  label: `${sub.name}${sub.archivedAt !== undefined ? '（削除済み）' : ''}`,
                })),
              ]}
              selected={[subCategoryFilter]}
              onToggle={setSubCategoryFilter}
              accessibilityLabel="サブカテゴリーで絞り込む"
            />
          )}
          <View style={styles.breakdown}>
            {subCategoryTotals.length === 0 ? (
              <Text style={styles.emptyNote}>集計できる作業時間がありません。</Text>
            ) : (
              subCategoryTotals.map((item) => (
                <BreakdownRow
                  key={item.subCategoryId ?? item.subCategoryName}
                  name={item.subCategoryName}
                  seconds={item.seconds}
                  ratio={item.ratio}
                  archived={item.archived}
                />
              ))
            )}
          </View>
        </Panel>

        <Panel title={`作業セッション（${filteredEntries.length}件）`} eyebrow="SESSIONS">
          {visibleEntries.length === 0 ? (
            <EmptyState message="この条件の作業履歴はまだありません。" />
          ) : (
            <View style={styles.entries}>
              {visibleEntries.map((entry) => (
                <View key={entry.sessionId} style={styles.entry}>
                  <View style={styles.entryBody}>
                    <Text style={styles.entryTitle} numberOfLines={2}>
                      {entry.taskTitle}
                    </Text>
                    <Text style={styles.entryMeta} numberOfLines={1}>
                      {formatEntryDate(entry.startedAt)}・{entry.categoryName}
                      {entry.subCategoryName !== null ? ` / ${entry.subCategoryName}` : ''}
                    </Text>
                    <Text style={styles.entryDuration}>
                      {formatWorkDuration(entry.durationSeconds)}
                    </Text>
                  </View>
                  <Badge
                    label={entry.completed ? '完了' : '中断'}
                    tone={entry.completed ? 'success' : 'warning'}
                  />
                </View>
              ))}
            </View>
          )}
          {filteredEntries.length > visibleEntries.length && (
            <Text style={styles.emptyNote}>
              最新{visibleEntries.length}件を表示しています（全{filteredEntries.length}件）。
            </Text>
          )}
        </Panel>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    minHeight: 150,
    marginTop: spacing.sm,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  chartTrack: {
    width: '100%',
    height: 104,
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chartBar: {
    width: '100%',
    minHeight: 3,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  chartBarEmpty: {
    backgroundColor: colors.border,
  },
  chartLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
  },
  chartValue: {
    color: colors.textSubtle,
    fontSize: 7,
    fontWeight: '700',
  },
  breakdown: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  breakdownRow: {
    gap: 3,
  },
  breakdownHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  breakdownName: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  breakdownValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  breakdownMeta: {
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: '700',
  },
  emptyNote: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  entries: {
    gap: spacing.sm,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  entryBody: {
    flex: 1,
    gap: 1,
  },
  entryTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  entryMeta: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  entryDuration: {
    color: colors.primaryDark,
    fontSize: fontSize.md,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
