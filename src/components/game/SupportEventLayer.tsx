import { useEffect } from 'react';
import { CHARACTER_DEFINITIONS } from '../../data/seed';
import { isRestDue } from '../../domain/rest';
import { attributeClass } from '../../features/companions/characterVisual';
import { useNow } from '../../hooks/useNow';
import { useAppStore } from '../../stores/appStore';

/** 設定時間が経過した休憩を完了させる（再読み込み後も復元される） */
function useRestCompletionWatcher() {
  const restSession = useAppStore((s) => s.restSession);
  const completeRest = useAppStore((s) => s.completeRest);
  const now = useNow(1000, restSession?.state === 'active');

  useEffect(() => {
    if (restSession !== null && isRestDue(restSession, now)) {
      completeRest();
    }
  }, [restSession, now, completeRest]);
}

/** 長時間の連続作業を定期的に確認し、応援イベントを一度だけ発生させる */
function useLongWorkWatcher() {
  const activeSession = useAppStore((s) => s.activeSession);
  const checkLongWorkSupport = useAppStore((s) => s.checkLongWorkSupport);
  const isRunning = activeSession?.state === 'running';
  const now = useNow(10_000, isRunning);

  useEffect(() => {
    if (isRunning) checkLongWorkSupport();
  }, [now, isRunning, activeSession?.id, checkLongWorkSupport]);
}

/** キャラクターの応援イベントを画面全体に表示する */
export function SupportEventLayer() {
  useRestCompletionWatcher();
  useLongWorkWatcher();

  const supportEvents = useAppStore((s) => s.supportEvents);
  const acknowledgeSupportEvent = useAppStore((s) => s.acknowledgeSupportEvent);
  const event = supportEvents.find((item) => !item.seen);
  if (event === undefined) return null;

  const character =
    CHARACTER_DEFINITIONS.find((definition) => definition.id === event.characterId) ??
    CHARACTER_DEFINITIONS[0];
  const kindLabel =
    event.kind === 'consecutive-work'
      ? '連続作業のおうえん'
      : event.kind === 'long-work'
        ? '長時間作業のおうえん'
        : '休憩完了';

  return (
    <aside className="support-toast" role="status" aria-live="polite" aria-label="キャラクターからの応援">
      <span
        className={`support-toast__avatar unit-avatar ${attributeClass(character.attribute)}`}
        aria-hidden="true"
      >
        {character.name.slice(0, 1)}
      </span>
      <div className="support-toast__body">
        <p className="support-toast__title">
          {character.name} / {kindLabel}
        </p>
        <p className="support-toast__message">{event.message}</p>
      </div>
      <button
        type="button"
        className="support-toast__close"
        aria-label="応援メッセージを閉じる"
        onClick={() => acknowledgeSupportEvent(event.id)}
      >
        ×
      </button>
    </aside>
  );
}
