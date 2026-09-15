import { StyleSheet, View } from 'react-native';

import { AppText, IconBadge, ProgressBar } from '@/components/ui';
import { CATEGORY_META } from '@/constants/categories';
import { useStyles, useTheme, type Theme } from '@/theme';
import type { AppUsage } from '@/types/models';
import { formatDuration, formatDurationSpoken } from '@/utils/format';

export interface AppUsageRowProps {
  app: AppUsage;
  /** Minutes of the most-used app, so bars are relative to the top app. */
  maxMinutes: number;
}

export function AppUsageRow({ app, maxMinutes }: AppUsageRowProps) {
  const { colors } = useTheme();
  const styles = useStyles(createStyles);
  const category = CATEGORY_META[app.category];
  const categoryColor = colors.category[app.category];

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${app.appName}, ${category.label}, ${formatDurationSpoken(app.minutes)}, opened ${app.opens} times`}
    >
      <IconBadge name={category.icon} color={categoryColor} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText variant="body" numberOfLines={1} style={styles.name}>
            {app.appName}
          </AppText>
          <AppText variant="callout" tone="secondary" style={styles.tabular}>
            {formatDuration(app.minutes)}
          </AppText>
        </View>
        <ProgressBar value={maxMinutes > 0 ? app.minutes / maxMinutes : 0} color={categoryColor} height={4} />
        <AppText variant="footnote" tone="tertiary">
          {category.label} · {app.opens} opens
        </AppText>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    body: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: theme.spacing.md,
    },
    name: {
      flex: 1,
      fontWeight: '500',
    },
    tabular: {
      fontVariant: ['tabular-nums'],
    },
  });
