import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CATEGORY_META } from '@/constants/categories';
import { useStyles, useTheme, type Theme } from '@/theme';
import type { CategoryUsage } from '@/types/models';
import { formatDuration, formatDurationSpoken } from '@/utils/format';

export interface CategoryBreakdownProps {
  categories: CategoryUsage[];
}

/** A stacked bar of time per category with a legend underneath. */
export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const { colors } = useTheme();
  const styles = useStyles(createStyles);

  const total = categories.reduce((sum, c) => sum + c.minutes, 0);
  const percentOf = (minutes: number) => (total > 0 ? Math.round((minutes / total) * 100) : 0);

  const summary = categories
    .map((c) => `${CATEGORY_META[c.category].label} ${percentOf(c.minutes)} percent`)
    .join(', ');

  return (
    <View>
      <View style={styles.stack} accessible accessibilityRole="image" accessibilityLabel={`Time by category: ${summary}`}>
        {categories
          .filter((c) => c.minutes > 0)
          .map((c) => (
            <View key={c.category} style={{ flex: c.minutes, backgroundColor: colors.category[c.category] }} />
          ))}
      </View>

      <View style={styles.legend}>
        {categories.map((c) => (
          <View
            key={c.category}
            style={styles.legendRow}
            accessible
            accessibilityLabel={`${CATEGORY_META[c.category].label}, ${formatDurationSpoken(c.minutes)}, ${percentOf(c.minutes)} percent`}
          >
            <View style={[styles.swatch, { backgroundColor: colors.category[c.category] }]} />
            <AppText variant="callout" style={styles.legendLabel}>
              {CATEGORY_META[c.category].label}
            </AppText>
            <AppText variant="callout" tone="secondary" style={styles.tabular}>
              {formatDuration(c.minutes)}
            </AppText>
            <AppText variant="footnote" tone="tertiary" style={[styles.percent, styles.tabular]}>
              {percentOf(c.minutes)}%
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    stack: {
      flexDirection: 'row',
      height: 10,
      gap: 2,
      borderRadius: theme.radius.pill,
      overflow: 'hidden',
    },
    legend: {
      marginTop: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    swatch: {
      width: 10,
      height: 10,
      borderRadius: 3,
    },
    legendLabel: {
      flex: 1,
    },
    percent: {
      width: 40,
      textAlign: 'right',
    },
    tabular: {
      fontVariant: ['tabular-nums'],
    },
  });
