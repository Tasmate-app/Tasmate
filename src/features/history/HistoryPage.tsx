import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { HistoryGranularity } from '@tasmate/types';
import {
  aggregateByCategory,
  aggregateBySubCategory,
  buildHistoryEntries,
  buildTimeSeries,
  computeWorkTimeTotals,
  filterHistoryEntries,
  formatWorkDuration,
  getHistoryWindow,
  toDateKey,
} from '@tasmate/core';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { SelectInput } from '../../components/ui/Field';
import { useAppStore } from '../../stores/appStore';

interface GranularityOption {
  value: HistoryGranularity;
  label: string;
  count: number;
  rangeLabel: string;
}

const GRANULARITY_OPTIONS: GranularityOption[] = [
  { value: 'day', label: '日', count: 14, rangeLabel: '直近14日' },
  { value: 'week', label: '週', count: 8, rangeLabel: '直近8週' },
  { value: 'month', label: '月', count: 6, rangeLabel: '直近6か月' },
  { value: 'year', label: '年', count: 5, rangeLabel: '直近5年' },
];

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

/** 履歴（作業時間の集計・推移・セッション一覧） */
export function HistoryPage() {
  const sessionHistory = useAppStore((s) => s.sessionHistory);
  const tasks = useAppStore((s) => s.tasks);
  const categories = useAppStore((s) => s.categories);
  const subCategories = useAppStore((s) => s.subCategories);
  const deleteSession = useAppStore((s) => s.deleteSession);

  const [granularity, setGranularity] = useState<HistoryGranularity>('day');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subCategoryFilter, setSubCategoryFilter] = useState('');

  const handleDeleteSession = (sessionId: string, taskTitle: string) => {
    if (
      !window.confirm(
        `「${taskTitle}」の作業セッションを削除しますか？\n削除直後は「元に戻す」から復元できます。`,
      )
    ) {
      return;
    }
    deleteSession(sessionId);
  };

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

  const seriesOption =
    GRANULARITY_OPTIONS.find((option) => option.value === granularity) ?? GRANULARITY_OPTIONS[0];
  const todayKey = toDateKey(new Date());
  const series = useMemo(
    () => buildTimeSeries(filteredEntries, granularity, todayKey, seriesOption.count),
    [filteredEntries, granularity, todayKey, seriesOption.count],
  );
  const maxSeriesSeconds = Math.max(1, ...series.map((point) => point.seconds));
  const historyWindow = useMemo(
    () => getHistoryWindow(granularity, todayKey, seriesOption.count),
    [granularity, todayKey, seriesOption.count],
  );
  const rangeEntries = useMemo(
    () => filterHistoryEntries(filteredEntries, historyWindow),
    [filteredEntries, historyWindow],
  );
  const categoryTotals = useMemo(() => aggregateByCategory(rangeEntries), [rangeEntries]);
  const subCategoryTotals = useMemo(
    () => aggregateBySubCategory(rangeEntries),
    [rangeEntries],
  );

  const categoryOptions = categories.filter(
    (category) => category.id === categoryFilter || category.archivedAt === undefined,
  );
  const subCategoryOptions = subCategories.filter(
    (sub) => sub.categoryId === categoryFilter,
  );
  const visibleEntries = filteredEntries.slice(0, 200);

  return (
    <div className="game-screen">
      <div className="game-container">
        <div className="game-screen__head">
          <div>
            <h1 className="game-screen__title">履歴</h1>
            <p className="list-item__meta companion-lead">
              実際に作業した時間だけを集計します。一時停止中の時間は含みません。
            </p>
          </div>
          <Link to="/categories" className="btn btn--secondary">
            分類管理
          </Link>
        </div>

        <div className="stat-row history-summary">
          <div className="stat-pill">
            <span>今日</span>
            <strong>{formatWorkDuration(totals.today)}</strong>
          </div>
          <div className="stat-pill">
            <span>今週（月曜始まり）</span>
            <strong>{formatWorkDuration(totals.week)}</strong>
          </div>
          <div className="stat-pill">
            <span>今月</span>
            <strong>{formatWorkDuration(totals.month)}</strong>
          </div>
          <div className="stat-pill">
            <span>累計</span>
            <strong>{formatWorkDuration(totals.total)}</strong>
          </div>
        </div>

        <div className="page-grid page-grid--two">
          <Card title="作業時間の推移">
            <div className="history-toolbar">
              <div className="segmented" role="group" aria-label="集計単位">
                {GRANULARITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`segmented__button${granularity === option.value ? ' is-active' : ''}`}
                    aria-pressed={granularity === option.value}
                    onClick={() => setGranularity(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {filteredEntries.length === 0 ? (
              <p className="list-item__meta">この条件の作業履歴はまだありません。</p>
            ) : (
              <div className="history-chart" role="img" aria-label="作業時間の推移グラフ">
                {series.map((point) => (
                  <div key={point.key} className="history-chart__column">
                    <div className="history-chart__track">
                      <div
                        className={`history-chart__bar${point.seconds === 0 ? ' is-empty' : ''}`}
                        style={{ height: `${Math.max(2, (point.seconds / maxSeriesSeconds) * 100)}%` }}
                        title={`${point.label}：${formatWorkDuration(point.seconds)}`}
                      />
                    </div>
                    <span className="history-chart__label">{point.label}</span>
                    <span className="history-chart__value">
                      {formatWorkDuration(point.seconds)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={`カテゴリー別（${seriesOption.rangeLabel}）`}>
            <div className="history-filter">
              <label htmlFor="history-category-filter">カテゴリー</label>
              <SelectInput
                id="history-category-filter"
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setSubCategoryFilter('');
                }}
              >
                <option value="">すべて</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.archivedAt !== undefined ? '（削除済み）' : ''}
                  </option>
                ))}
              </SelectInput>
            </div>
            {categoryTotals.length === 0 ? (
              <p className="list-item__meta">集計できる作業時間がありません。</p>
            ) : (
              <ul className="history-breakdown">
                {categoryTotals.map((item) => (
                  <li key={item.categoryId ?? item.categoryName}>
                    <div className="history-breakdown__head">
                      <span>
                        {item.categoryName}
                        {item.archived ? '（削除済み）' : ''}
                      </span>
                      <strong>{formatWorkDuration(item.seconds)}</strong>
                    </div>
                    <div className="history-breakdown__bar">
                      <span style={{ width: `${Math.round(item.ratio * 100)}%` }} />
                    </div>
                    <span className="history-breakdown__meta">
                      全体の {Math.round(item.ratio * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="page-grid page-grid--two">
          <Card title={`サブカテゴリー別（${seriesOption.rangeLabel}）`}>
            <div className="history-filter">
              <label htmlFor="history-subcategory-filter">サブカテゴリー</label>
              <SelectInput
                id="history-subcategory-filter"
                value={subCategoryFilter}
                onChange={(event) => setSubCategoryFilter(event.target.value)}
                disabled={categoryFilter === ''}
              >
                <option value="">すべて</option>
                <option value="__none__">未分類</option>
                {subCategoryOptions.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                    {sub.archivedAt !== undefined ? '（削除済み）' : ''}
                  </option>
                ))}
              </SelectInput>
            </div>
            {categoryFilter === '' && (
              <p className="list-item__meta">
                カテゴリーを選ぶとサブカテゴリーで絞り込めます。
              </p>
            )}
            {subCategoryTotals.length === 0 ? (
              <p className="list-item__meta">集計できる作業時間がありません。</p>
            ) : (
              <ul className="history-breakdown">
                {subCategoryTotals.map((item) => (
                  <li key={item.subCategoryId ?? item.subCategoryName}>
                    <div className="history-breakdown__head">
                      <span>
                        {item.subCategoryName}
                        {item.archived ? '（削除済み）' : ''}
                      </span>
                      <strong>{formatWorkDuration(item.seconds)}</strong>
                    </div>
                    <div className="history-breakdown__bar">
                      <span style={{ width: `${Math.round(item.ratio * 100)}%` }} />
                    </div>
                    <span className="history-breakdown__meta">
                      全体の {Math.round(item.ratio * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`作業セッション（${filteredEntries.length}件）`}>
            {visibleEntries.length === 0 ? (
              <p className="list-item__meta">この条件の作業履歴はまだありません。</p>
            ) : (
              <ul className="list history-list">
                {visibleEntries.map((entry) => (
                  <li key={entry.sessionId} className="list-item">
                    <div className="history-entry__head">
                      <span className="list-item__title">{entry.taskTitle}</span>
                      <div className="history-entry__actions">
                        <Badge tone={entry.completed ? 'success' : 'warning'}>
                          {entry.completed ? '完了' : '中断'}
                        </Badge>
                        <button
                          type="button"
                          className="history-entry__delete"
                          aria-label={`${entry.taskTitle}の作業セッションを削除`}
                          onClick={() => handleDeleteSession(entry.sessionId, entry.taskTitle)}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                    <div className="list-item__meta">
                      {formatEntryDate(entry.startedAt)}・{entry.categoryName}
                      {entry.subCategoryName !== null && ` / ${entry.subCategoryName}`}
                    </div>
                    <div className="history-entry__duration">
                      {formatWorkDuration(entry.durationSeconds)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {filteredEntries.length > visibleEntries.length && (
              <p className="list-item__meta">
                最新{visibleEntries.length}件を表示しています（全{filteredEntries.length}件）。
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
