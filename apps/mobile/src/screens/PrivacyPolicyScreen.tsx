import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRIVACY_POLICY } from '@tasmate/core';
import { GameButton, Panel, ScreenBackground, ScreenHeader, screenContent } from '../ui';
import { colors, fontSize, spacing } from '../theme/tokens';

/** プライバシーポリシー画面。設定画面から遷移して全文を表示する */
export function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.md + insets.top,
            paddingBottom: spacing.xxl + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="PRIVACY"
          title={PRIVACY_POLICY.title}
          subtitle={`最終更新日：${PRIVACY_POLICY.lastUpdated}`}
          right={
            <GameButton label="戻る" size="sm" variant="secondary" onPress={goBack} />
          }
        />

        <Panel tone="primary">
          {PRIVACY_POLICY.intro.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}

          {PRIVACY_POLICY.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text accessibilityRole="header" style={styles.heading}>
                {section.heading}
              </Text>
              {section.paragraphs.map((paragraph) => (
                <Text key={paragraph} style={styles.paragraph}>
                  {paragraph}
                </Text>
              ))}
              {section.bullets !== undefined && (
                <View style={styles.bullets}>
                  {section.bullets.map((item) => (
                    <View key={item} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </Panel>

        <GameButton label="設定に戻る" variant="secondary" onPress={goBack} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    ...screenContent,
    paddingTop: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  heading: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
    lineHeight: 22,
  },
  paragraph: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 21,
  },
  bullets: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletDot: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '900',
    lineHeight: 21,
  },
  bulletText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 21,
  },
});
