import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { TutorialModal } from './TutorialModal';

export function TutorialGate() {
  const tutorialCompletedAt = useAppStore((s) => s.settings.tutorialCompletedAt);
  const markTutorialCompleted = useAppStore((s) => s.markTutorialCompleted);
  const [open, setOpen] = useState(() => tutorialCompletedAt === null);

  const close = () => {
    setOpen(false);
    markTutorialCompleted(new Date().toISOString());
  };

  return <TutorialModal open={open} onClose={close} />;
}
