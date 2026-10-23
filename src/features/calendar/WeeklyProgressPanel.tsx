import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import {
  formatPercent,
  formatWeekRange,
  multiplierForStreak,
  nextRankForStreak,
  nextWeekStartKey,
  rankForStreak,
  requiredCompletedTasks,
  summarizeWeek,
  weeklyStatusLabel,
  weekStartKey,
} from '../../domain/weekly';
import { useAppStore } from '../../stores/appStore';

/** 現在の継続状況・週間達成・休息週・直近の判定履歴 */
export function WeeklyProgressPanel() {
  const tasks = useAppStore((s) => s.tasks);
  const progress = useAppStore((s) => s.weeklyProgress);
  const evaluations = useAppStore((s) => s.weeklyEvaluations);
  const restWeeks = useAppStore((s) => s.restWeeks);
  const toggleRestWeek = useAppStore((s) => s.toggleRestWeek);

  const [feedback, setFeedback] = useState('');

  const currentWeek = weekStartKey(new Date());
  const nextWeek = nextWeekStartKey(currentWeek);
  const summary = useMemo(() => summarizeWeek(tasks, currentWeek), [tasks, currentWeek]);
  const rank = rankForStreak(progress.currentStreak);
  const nextRank = nextRankForStreak(progress.currentStreak);
  const currentMultiplier = multiplierForStreak(progress.currentStreak);
  const required = requiredCompletedTasks(summary.eligibleTaskCount);
  const remaining = Math.max(0, required - summary.completedTaskCount);
  const isRest = restWeeks.includes(currentWeek);
  const nextIsRest = restWeeks.includes(nextWeek);

  const latest = evaluations[0];

  const onToggleRest = (weekStart: string, label: string, active: boolean) => {
    const ok = toggleRestWeek(weekStart);
    if (ok) {
      setFeedback(active ? `${label}の休息設定を解除しました。` : `${label}を休息週に設定しました。`);
    } else {
      setFeedback('休息週を設定できません。連続利用の上限、または判定済みの週です。');
    }
  };

  const rankProgress =
    nextRank === null
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            ((progress.currentStreak - rank.minStreak) /
              Math.max(1, nextRank.minStreak - rank.minStreak)) *
              100,
          ),
        );

  return (
    <section className="weekly-panel" aria-label="週間の継続状況">
      <article className="panel weekly-rank">
        <div className="weekly-rank__head">
          <div>
            <p className="eyebrow">現在の継続ランク</p>
            <h2>{rank.name}</h2>
          </div>
          <div className="weekly-multiplier" aria-label={`報酬倍率 ${currentMultiplier.toFixed(2)}倍`}>
            <span>報酬倍率</span>
            <strong>×{currentMultiplier.toFixed(2)}</strong>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-pill">
            <span>連続達成</span>
            <strong>{progress.currentStreak}週</strong>
          </div>
          <div className="stat-pill">
            <span>最高記録</span>
            <strong>{progress.highestStreak}週</strong>
          </div>
          <div className="stat-pill">
            <span>累計達成</span>
            <strong>{progress.totalSuccessfulWeeks}週</strong>
          </div>
        </div>
        <div className="rank-progress">
          <div className="rank-progress__label">
            <span>{nextRank === null ? '最高ランクに到達' : `次は ${nextRank.name}`}</span>
            {nextRank !== null && (
              <span>
                あと {Math.max(0, nextRank.minStreak - progress.currentStreak)}週 ・ ×
                {nextRank.multiplier.toFixed(2)}
              </span>
            )}
          </div>
          <div className="progress-bar" aria-hidden="true">
            <span style={{ width: `${rankProgress}%` }} />
          </div>
        </div>
        <p className="weekly-note">
          未達成でも連続週数が1つ減るだけで、累計達成週数と最高記録は失われません。
        </p>
      </article>

      <article className="panel weekly-current">
        <div className="section-head">
          <div>
            <p className="eyebrow">今週</p>
            <h2>{formatWeekRange(currentWeek)}</h2>
          </div>
          <span className={`status-chip${isRest ? ' status-chip--rest' : ''}`}>
            {isRest ? '休息週' : '集計中'}
          </span>
        </div>

        {isRest ? (
          <p className="weekly-message">
            今週は休息週です。連続週数は維持されますが、達成には数えません。
          </p>
        ) : summary.eligibleTaskCount === 0 ? (
          <p className="weekly-message">
            今週の予定タスクはまだありません。カレンダーから予定を追加すると達成率が集計されます。
          </p>
        ) : (
          <>
            <div className="weekly-current__numbers">
              <div>
                <strong>{summary.completedTaskCount}</strong>
                <span>/ {summary.eligibleTaskCount} 件完了</span>
              </div>
              <strong className="weekly-current__rate">{formatPercent(summary.completionRate)}</strong>
            </div>
            <div className="progress-bar progress-bar--large" aria-hidden="true">
              <span style={{ width: `${Math.min(100, (summary.completionRate ?? 0) * 100)}%` }} />
            </div>
            <p className="weekly-message">
              {remaining === 0
                ? '80%に到達しています。このまま完了数を維持しましょう。'
                : `あと ${remaining} 件完了すると週間達成です（80%基準）。`}
            </p>
          </>
        )}

        <div className="weekly-current__actions">
          <Button
            type="button"
            variant={isRest ? 'secondary' : 'primary'}
            onClick={() => onToggleRest(currentWeek, '今週', isRest)}
          >
            {isRest ? '今週の休息を解除' : '今週を休息週にする'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onToggleRest(nextWeek, '来週', nextIsRest)}
          >
            {nextIsRest ? '来週の休息を解除' : '来週を休息週にする'}
          </Button>
        </div>
        {feedback !== '' && <p className="weekly-feedback">{feedback}</p>}
      </article>

      <article className="panel weekly-history">
        <div className="section-head">
          <div>
            <p className="eyebrow">週次判定</p>
            <h2>直近の記録</h2>
          </div>
        </div>
        {latest === undefined ? (
          <p className="weekly-message">週が終わると、ここに達成率とランクの変化が記録されます。</p>
        ) : (
          <>
            <div className="latest-evaluation">
              <div className="latest-evaluation__head">
                <span className={`status-chip status-chip--${latest.status}`}>
                  {weeklyStatusLabel(latest.status)}
                </span>
                <span>{formatWeekRange(latest.weekStart)}</span>
              </div>
              <div className="latest-evaluation__body">
                <div>
                  <span>達成率</span>
                  <strong>{formatPercent(latest.completionRate)}</strong>
                </div>
                <div>
                  <span>連続週数</span>
                  <strong>
                    {latest.streakBefore} → {latest.streakAfter}
                  </strong>
                </div>
                <div>
                  <span>倍率</span>
                  <strong>
                    ×{latest.multiplierBefore.toFixed(2)} → ×
                    {latest.multiplierAfter.toFixed(2)}
                  </strong>
                </div>
              </div>
              <p className="list-item__meta">
                対象 {latest.eligibleTaskCount} 件 / 完了 {latest.completedTaskCount} 件
              </p>
            </div>
            <ul className="evaluation-list">
              {evaluations.slice(1, 8).map((evaluation) => (
                <li key={evaluation.id} className="evaluation-list__item">
                  <span className={`status-dot status-dot--${evaluation.status}`} aria-hidden="true" />
                  <div>
                    <strong>{formatWeekRange(evaluation.weekStart)}</strong>
                    <span>{weeklyStatusLabel(evaluation.status)}</span>
                  </div>
                  <span>{formatPercent(evaluation.completionRate)}</span>
                  <span>{evaluation.streakAfter}週</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
    </section>
  );
}
