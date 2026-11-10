import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, shadows, spacing } from '../theme/tokens';

interface HydrationGateProps {
  error: string | null;
}

export function HydrationGate({ error }: HydrationGateProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.mark}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <Text style={styles.title}>Tasmate</Text>
        <Text style={styles.subtitle}>STUDY QUEST</Text>
        <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
        <Text style={styles.message}>ゲームデータを読み込んでいます…</Text>
        {error !== null && <Text style={styles.error}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...shadows.floating,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 2.4,
    marginTop: 2,
  },
  spinner: {
    marginTop: spacing.xl,
  },
  message: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
