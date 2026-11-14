import { useState } from 'react';
import { useMobileAppStore } from '../../stores/appStore';
import { TutorialSheet } from './TutorialSheet';

export function TutorialGate() {
  const tutorialCompletedAt = useMobileAppStore(
    (s) => s.settings.tutorialCompletedAt,
  );
  const markTutorialCompleted = useMobileAppStore(
    (s) => s.markTutorialCompleted,
  );
  const [visible, setVisible] = useState(() => tutorialCompletedAt === null);

  const close = () => {
    setVisible(false);
    markTutorialCompleted(new Date().toISOString());
  };

  return <TutorialSheet visible={visible} onClose={close} />;
}
