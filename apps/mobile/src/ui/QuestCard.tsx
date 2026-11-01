import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, type BadgeTone } from './Badge';
import { GameButton } from './GameButton';
import { colors, fontSize, radius, shadows, spacing } from '../theme/tokens';

interface QuestCardBadge {
  label: string;
  tone?: BadgeTone;
}

interface QuestCardProps {
  title: string;
  category: string;
  categoryColor: string;
  schedule: string;
  time: string;
  estimatedMinutes: number;
  description?: string;
  badges?: QuestCardBadge[];
  onPress: () => void;
  onStart: () => void;
}

export function QuestCard({
  title,
  category,
  categoryColor,
  schedule,
  time,
  estimatedMinutes,
  description,
  badges = [],
  onPress,
  onStart,
}: QuestCardProps) {
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}を編集`}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed ? styles.pressed : null]}
      >
        <View style={[styles.gem, { borderColor: `${categoryColor}55` }]}>
          <View style={[styles.gemInner, { backgroundColor: `${categoryColor}18` }]}>
            <Text style={[styles.gemGlyph, { color: categoryColor }]}>◈</Text>
          </View>
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            {badges.map((badge) => (
              <Badge key={badge.label} label={badge.label} tone={badge.tone} />
            ))}
          </View>
          <View style={styles.chipRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaGlyph}>◷</Text>
              <Text style={styles.metaText}>{time}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaGlyph}>✦</Text>
              <Text style={styles.metaText}>{estimatedMinutes}分</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={[styles.metaGlyph, { color: categoryColor }]}>◎</Text>
              <Text style={styles.metaText}>{category}</Text>
            </View>
          </View>
          <Text style={styles.schedule}>{schedule}</Text>
          {description !== undefined && description !== '' && (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>
      </Pressable>
      <View style={styles.actions}>
        <GameButton label="編集" size="sm" variant="ghost" onPress={onPress} style={styles.edit} />
        <GameButton label="出撃準備" size="sm" onPress={onStart} style={styles.start} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.soft,
  },
  main: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },
  gem: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    padding: 3,
  },
  gemInner: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gemGlyph: {
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
    flexShrink: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  metaGlyph: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  schedule: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
  },
  description: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  edit: {
    flex: 1,
  },
  start: {
    flex: 1.4,
  },
});
