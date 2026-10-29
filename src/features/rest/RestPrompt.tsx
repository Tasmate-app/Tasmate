import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Field';
import { CHARACTER_DEFINITIONS } from '../../data/seed';
import {
  REST_PRESET_MINUTES,
  clampRestMinutes,
  recommendedRestMinutes,
  remainingRestSeconds,
} from '../../domain/rest';
import { formatElapsed } from '../../domain/session';
import { useNow } from '../../hooks/useNow';
import { sessionElapsedSeconds, useAppStore } from '../../stores/appStore';

interface RestPromptProps {
  rewardId: string;
}

/** 作業終了後にキャラクターが休憩を促し、休憩時間を設定できるパネル */
export function RestPrompt({ rewardId }: RestPromptProps) {
  const rewards = useAppStore((s) => s.rewards);
  const sessionHistory = useAppStore((s) => s.sessionHistory);
  const restSession = useAppStore((s) => s.restSession);
  const startRest = useAppStore((s) => s.startRest);
  const skipRest = useAppStore((s) => s.skipRest);

  const reward = rewards.find((r) => r.id === rewardId);
  const session = sessionHistory.find((s) => s.id === reward?.workSessionId);
  const rawWorkMinutes =
    session !== undefined
      ? sessionElapsedSeconds(session, session.endedAt ? Date.parse(session.endedAt) : Date.now()) /
        60
      : 0;
  const recommendedMinutes = recommendedRestMinutes(rawWorkMinutes);
  const [minutes, setMinutes] = useState(recommendedMinutes);
  const [dismissed, setDismissed] = useState(false);

  const isResting = restSession?.state === 'active';
  const now = useNow(1000, isResting);
  const remaining = restSession !== null ? remainingRestSeconds(restSession, now) : 0;

  if (reward === undefined || session === undefined || dismissed) return null;

  const characterId = session.assignedCharacterIds[0];
  const character =
    CHARACTER_DEFINITIONS.find((definition) => definition.id === characterId) ??
    CHARACTER_DEFINITIONS[0];
  const isFinishedRest =
    restSession?.state === 'completed' && restSession.sourceSessionId === session.id;

  if (isResting) {
    return (
      <section className="rest-prompt rest-prompt--active" aria-label="休憩中">
        <p className="rest-prompt__title">{character.name}と休憩中</p>
        <p className="rest-prompt__timer" aria-live="polite">
          残り {formatElapsed(remaining)}
        </p>
        <p className="list-item__meta">
          休憩が終わったら、また次のクエストへ。休息も大事な準備です。
        </p>
        <div className="btn-row">
          <Button
            variant="secondary"
            onClick={() => {
              setDismissed(true);
              skipRest();
            }}
          >
            休憩を切り上げる
          </Button>
        </div>
      </section>
    );
  }

  if (isFinishedRest) {
    return (
      <section className="rest-prompt rest-prompt--done" aria-label="休憩完了">
        <p className="rest-prompt__title">{character.name}「休憩おつかれさま！」</p>
        <p className="list-item__meta">
          頭がすっきりしました。次のクエストも無理のないペースで進めましょう。
        </p>
      </section>
    );
  }

  return (
    <section className="rest-prompt" aria-label="休憩の提案">
      <div className="rest-prompt__speech">
        <span className="rest-prompt__avatar" aria-hidden="true">
          {character.name.slice(0, 1)}
        </span>
        <div>
          <p className="rest-prompt__title">{character.name}からの提案</p>
          <p className="rest-prompt__message">
            「おつかれさま！{recommendedMinutes}分くらい休憩して、頭をリセットしよう」
          </p>
        </div>
      </div>
      <Field label="休憩時間（分）" htmlFor={`rest-minutes-${rewardId}`}>
        <TextInput
          id={`rest-minutes-${rewardId}`}
          type="number"
          min={1}
          max={60}
          value={minutes}
          onChange={(event) => setMinutes(Number(event.target.value))}
        />
      </Field>
      <div className="rest-prompt__presets" role="group" aria-label="休憩時間のプリセット">
        {REST_PRESET_MINUTES.map((preset) => {
          const selected = clampRestMinutes(minutes) === preset;
          return (
            <button
              key={preset}
              type="button"
              className={`rest-preset${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => setMinutes(preset)}
            >
              {preset}分
            </button>
          );
        })}
      </div>
      <div className="btn-row">
        <Button onClick={() => startRest(minutes, session.id)}>休憩をはじめる</Button>
      </div>
      <p className="list-item__meta">
        休憩しても作業報酬は減りません。続けて作業する場合は、キャラクターが応援に来ます。
      </p>
    </section>
  );
}
