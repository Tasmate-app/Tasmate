import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, type BadgeTone } from './Badge';
import { GameButton } from './GameButton';
import { colors, fontSize, radius, shadows, spacing, withAlpha } from '../theme/tokens';

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
    <View style={[styles.card, { borderColor: withAlpha(categoryColor, 0.24) }]}>
      <View pointerEvents="none" style={[styles.rail, { backgroundColor: categoryColor }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}を編集`}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed ? styles.pressed : null]}
      >
        <View style={[styles.gem, { backgroundColor: withAlpha(categoryColor, 0.12) }]}>
          <View style={[styles.gemRing, { borderColor: withAlpha(categoryColor, 0.34) }]}>
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
          <Text style={styles.schedule}>{schedule}</Text>
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
          {description !== undefined && description !== '' && (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>
      </Pressable>
      <View style={styles.actions}>
        <GameButton
          label="編集"
          size="sm"
          variant="ghost"
          onPress={onPress}
          style={styles.edit}
        />
        <GameButton
          label="出撃準備 →"
          size="sm"
          onPress={onStart}
          style={styles.start}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.soft,
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  main: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.82,
  },
  gem: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gemRing: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
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
    lineHeight: 19,
  },
  schedule: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 1,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
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
  description: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  edit: {
    flex: 0.8,
  },
  start: {
    flex: 1.6,
  },
});
