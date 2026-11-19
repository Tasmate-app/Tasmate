import { useEffect } from 'react';
import type { PendingDeletion } from '@tasmate/core';
import { useAppStore } from '../../stores/appStore';

const UNDO_VISIBLE_MS = 6000;

const KIND_LABELS: Record<PendingDeletion['kind'], string> = {
  task: 'クエスト',
  category: 'カテゴリー',
  subCategory: 'サブカテゴリー',
  recurrenceRule: '繰り返し',
  session: '作業セッション',
};

/** 削除直後に「元に戻す」操作を提示する */
export function UndoToast() {
  const lastDeletion = useAppStore((s) => s.lastDeletion);
  const undoLastDeletion = useAppStore((s) => s.undoLastDeletion);
  const dismissLastDeletion = useAppStore((s) => s.dismissLastDeletion);
  const hasSupportEvent = useAppStore((s) => s.supportEvents.some((event) => !event.seen));

  useEffect(() => {
    if (lastDeletion === null) return;
    const remaining = Math.max(
      0,
      Date.parse(lastDeletion.deletedAt) + UNDO_VISIBLE_MS - Date.now(),
    );
    const timer = window.setTimeout(dismissLastDeletion, remaining);
    return () => window.clearTimeout(timer);
  }, [lastDeletion, dismissLastDeletion]);

  if (lastDeletion === null) return null;

  return (
    <aside
      className={`undo-toast${hasSupportEvent ? ' undo-toast--stacked' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="削除の取り消し"
    >
      <p className="undo-toast__message">
        {KIND_LABELS[lastDeletion.kind]}「{lastDeletion.label}」を削除しました
      </p>
      <button type="button" className="undo-toast__action" onClick={undoLastDeletion}>
        元に戻す
      </button>
      <button
        type="button"
        className="undo-toast__close"
        aria-label="削除の通知を閉じる"
        onClick={dismissLastDeletion}
      >
        ×
      </button>
    </aside>
  );
}
