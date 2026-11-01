import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, radius } from '../theme/tokens';

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
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontWeight: '800',
  },
});

const sizeStyles = StyleSheet.create({
  sm: { minHeight: 36, paddingHorizontal: 12, paddingVertical: 6 },
  md: { minHeight: 46, paddingHorizontal: 16, paddingVertical: 10 },
  lg: { minHeight: 54, paddingHorizontal: 20, paddingVertical: 14 },
});

const sizeLabelStyles = StyleSheet.create({
  sm: { fontSize: fontSize.sm },
  md: { fontSize: fontSize.md },
  lg: { fontSize: fontSize.lg },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  ghost: { backgroundColor: colors.primaryPale, borderColor: colors.border },
  danger: { backgroundColor: colors.dangerSoft, borderColor: '#f5b5b5' },
  success: { backgroundColor: colors.success, borderColor: colors.success },
});

const variantLabelStyles = StyleSheet.create({
  primary: { color: colors.white },
  secondary: { color: colors.text },
  ghost: { color: colors.primaryDark },
  danger: { color: colors.danger },
  success: { color: colors.white },
});
