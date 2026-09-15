import { StyleSheet } from 'react-native';

import { BarChart, MetricTile } from '@/components/data';
import { Card } from '@/components/ui';
import { useStyles, type Theme } from '@/theme';
import type { DailyUsagePoint } from '@/types/models';
import { formatDuration, formatDurationSpoken, formatWeekdayShort } from '@/utils/format';

export function WeeklyScreenTimeCard({ days }: { days: DailyUsagePoint[] }) {
  const styles = useStyles(createStyles);

  const average = days.reduce((sum, d) => sum + d.screenTimeMinutes, 0) / Math.max(days.length, 1);
  const today = days[days.length - 1];

  const bars = days.map((d) => ({
    key: d.date,
    label: formatWeekdayShort(d.date),
    value: d.screenTimeMinutes,
  }));

  const spokenSummary = days
    .map((d) => `${formatWeekdayShort(d.date)} ${formatDurationSpoken(d.screenTimeMinutes)}`)
    .join(', ');

  return (
    <Card padding="xl">
      <MetricTile
        label="Daily average"
        value={formatDuration(average)}
        valueAccessibilityLabel={formatDurationSpoken(average)}
        style={styles.average}
      />
      <BarChart
        data={bars}
        highlightKey={today?.date}
        accessibilityLabel={`Screen time, last 7 days: ${spokenSummary}`}
      />
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    average: {
      marginBottom: theme.spacing.xl,
    },
  });
