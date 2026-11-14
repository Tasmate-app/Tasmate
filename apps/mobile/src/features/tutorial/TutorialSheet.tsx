import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TUTORIAL_STEPS } from '@tasmate/core';
import { GameButton, ModalSheet } from '../../ui';
import { colors, fontSize, radius, spacing } from '../../theme/tokens';

interface TutorialSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function TutorialSheet({ visible, onClose }: TutorialSheetProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (visible) setStepIndex(0);
  }, [visible]);

  const step = TUTORIAL_STEPS[stepIndex] ?? TUTORIAL_STEPS[0];
  const lastIndex = TUTORIAL_STEPS.length - 1;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === lastIndex;

  const handleNext = () => {
    if (isLast) {
      onCloseRef.current();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, lastIndex));
  };

  return (
    <ModalSheet
      visible={visible}
      title={step.title}
      subtitle={`STEP ${stepIndex + 1} / ${TUTORIAL_STEPS.length} · ${step.eyebrow}`}
      eyebrow="TUTORIAL"
      onClose={() => onCloseRef.current()}
    >
      <View style={styles.hero}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepNumber}>
            {String(stepIndex + 1).padStart(2, '0')}
          </Text>
        </View>
        <Text style={styles.body}>{step.body}</Text>
      </View>

      <View style={styles.points}>
        {step.points.map((point) => (
          <View key={point} style={styles.pointRow}>
            <View style={styles.pointDot} />
            <Text style={styles.pointText}>{point}</Text>
          </View>
        ))}
      </View>

      <View style={styles.dots}>
        {TUTORIAL_STEPS.map((item, index) => (
          <View
            key={item.id}
            style={[styles.dot, index === stepIndex ? styles.dotActive : null]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <GameButton
          label="スキップ"
          variant="secondary"
          size="sm"
          onPress={() => onCloseRef.current()}
        />
        <View style={styles.stepActions}>
          <GameButton
            label="戻る"
            variant="secondary"
            size="sm"
            onPress={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={isFirst}
            style={styles.stepAction}
          />
          <GameButton
            label={isLast ? 'はじめる' : '次へ'}
            size="sm"
            onPress={handleNext}
            style={styles.stepAction}
          />
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepBadge: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primaryPale,
  },
  stepNumber: {
    color: colors.primaryDark,
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: 1,
  },
  body: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontWeight: '700',
    lineHeight: 24,
  },
  points: {
    gap: spacing.sm,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  pointDot: {
    width: 7,
    height: 7,
    marginTop: 7,
    borderRadius: 2,
    backgroundColor: colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  pointText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
    lineHeight: 21,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stepActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepAction: {
    flex: 1,
  },
});
