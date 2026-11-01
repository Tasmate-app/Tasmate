import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, radius, shadows } from '../theme/tokens';

type GameButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type GameButtonSize = 'sm' | 'md' | 'lg';

interface GameButtonProps {
  label: string;
  onPress: () => void;
  variant?: GameButtonVariant;
  size?: GameButtonSize;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function GameButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  accessibilityLabel,
}: GameButtonProps) {
  const hasGloss = variant === 'primary' || variant === 'success';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {hasGloss && <View pointerEvents="none" style={styles.gloss} />}
      <Text style={[styles.label, sizeLabelStyles[size], variantLabelStyles[variant]]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 46,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  gloss: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 2,
    height: 1,
    borderRadius: 1,
    backgroundColor: colors.highlight,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});

const sizeStyles = StyleSheet.create({
  sm: { minHeight: 38, paddingHorizontal: 12, paddingVertical: 6 },
  md: { minHeight: 46, paddingHorizontal: 16, paddingVertical: 10 },
  lg: { minHeight: 54, paddingHorizontal: 20, paddingVertical: 14 },
});

const sizeLabelStyles = StyleSheet.create({
  sm: { fontSize: fontSize.sm },
  md: { fontSize: fontSize.md },
  lg: { fontSize: fontSize.lg },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    borderBottomWidth: 3,
    ...shadows.glow,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderBottomWidth: 2,
    ...shadows.soft,
  },
  ghost: { backgroundColor: colors.primaryPale, borderColor: colors.border },
  danger: { backgroundColor: colors.dangerSoft, borderColor: '#f2a9ba' },
  success: {
    backgroundColor: colors.success,
    borderColor: '#0b7f57',
    borderBottomWidth: 3,
    shadowColor: colors.success,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
});

const variantLabelStyles = StyleSheet.create({
  primary: { color: colors.white },
  secondary: { color: colors.text },
  ghost: { color: colors.primaryDark },
  danger: { color: colors.danger },
  success: { color: colors.white },
});
