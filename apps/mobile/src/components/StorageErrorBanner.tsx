import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../theme/tokens';

export function StorageErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.title}>保存データの処理に失敗しました</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.dangerSoft,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f5b5b5',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  title: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontWeight: '900',
  },
  message: {
    color: colors.text,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
});
