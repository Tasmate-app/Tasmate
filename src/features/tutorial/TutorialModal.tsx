import { useEffect, useRef, useState } from 'react';
import { TUTORIAL_STEPS } from '@tasmate/core';
import { Button } from '../../components/ui/Button';

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
}

export function TutorialModal({ open, onClose }: TutorialModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setStepIndex(0);
    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  const step = TUTORIAL_STEPS[stepIndex] ?? TUTORIAL_STEPS[0];
  const lastIndex = TUTORIAL_STEPS.length - 1;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === lastIndex;

  const handleNext = () => {
    if (isLast) {
      onClose();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, lastIndex));
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <section
        ref={dialogRef}
        className="modal tutorial-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-body"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tutorial-modal__head">
          <div>
            <p className="eyebrow">TUTORIAL / {step.eyebrow}</p>
            <p className="tutorial-modal__count">
              {stepIndex + 1} / {TUTORIAL_STEPS.length}
            </p>
          </div>
          <button
            type="button"
            className="tutorial-modal__close"
            aria-label="チュートリアルを閉じる"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="tutorial-modal__body" aria-live="polite">
          <span className="tutorial-modal__step" aria-hidden="true">
            {String(stepIndex + 1).padStart(2, '0')}
          </span>
          <h2 id="tutorial-title">{step.title}</h2>
          <p id="tutorial-body">{step.body}</p>
          <ul className="tutorial-modal__points">
            {step.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>

        <div className="tutorial-modal__dots" aria-hidden="true">
          {TUTORIAL_STEPS.map((item, index) => (
            <span
              key={item.id}
              className={`tutorial-modal__dot${index === stepIndex ? ' is-active' : ''}`}
            />
          ))}
        </div>

        <div className="tutorial-modal__actions">
          <Button variant="secondary" onClick={onClose}>
            スキップ
          </Button>
          <div className="btn-row">
            <Button
              variant="secondary"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={isFirst}
            >
              戻る
            </Button>
            <Button onClick={handleNext}>{isLast ? 'はじめる' : '次へ'}</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
