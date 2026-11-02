import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme/tokens';

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint !== undefined && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

export function GameTextInput({
  style,
  onFocus,
  onBlur,
  multiline,
  ...props
}: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.textSubtle}
      multiline={multiline}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        multiline === true ? styles.inputMultiline : null,
        focused ? styles.inputFocused : null,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
