import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, radius, shadows } from '../theme/tokens';

type GameButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'gold';
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
  const hasGloss = variant === 'primary' || variant === 'success' || variant === 'gold';
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
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 46,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  gloss: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 2,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.highlight,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.44,
  },
  label: {
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

const sizeStyles = StyleSheet.create({
  sm: { minHeight: 38, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm },
  md: { minHeight: 46, paddingHorizontal: 16, paddingVertical: 10 },
  lg: { minHeight: 54, paddingHorizontal: 20, paddingVertical: 14, borderRadius: radius.lg },
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
  ghost: {
    backgroundColor: colors.primaryPale,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#f2a9ba',
    borderBottomWidth: 2,
  },
  success: {
    backgroundColor: colors.success,
    borderColor: '#0b7f57',
    borderBottomWidth: 3,
    ...shadows.card,
  },
  gold: {
    backgroundColor: colors.gold,
    borderColor: '#d99716',
    borderBottomWidth: 3,
    ...shadows.gold,
  },
});

const variantLabelStyles = StyleSheet.create({
  primary: { color: colors.white },
  secondary: { color: colors.text },
  ghost: { color: colors.primaryDark },
  danger: { color: colors.danger },
  success: { color: colors.white },
  gold: { color: '#7a4b00' },
});
