import { StyleSheet, View } from 'react-native';

import { MetricTile, TrendLabel } from '@/components/data';
import { AppText, Card, Divider, ProgressBar } from '@/components/ui';
import { useStyles, type Theme } from '@/theme';
import type { DailySummary } from '@/types/models';
import { formatDuration, formatDurationSpoken, formatNumber } from '@/utils/format';

const formatPercent = (n: number) => `${Math.round(n)}%`;

export function TodaySummaryCard({ summary }: { summary: DailySummary }) {
  const styles = useStyles(createStyles);

  return (
    <Card padding="xl">
      <MetricTile
        size="lg"
        label="Focus score"
        value={String(summary.focusScore)}
        unit="/ 100"
        trend={
          <TrendLabel
            change={summary.focusScoreChange}
            format={(n) => `${n} pts`}
            higherIsBetter
            context="vs. yesterday"
          />
        }
      />
      <ProgressBar value={summary.focusScore / 100} style={styles.progress} />
      <AppText variant="footnote" tone="tertiary" style={styles.explainer}>
        Based on pickups, uninterrupted time and notifications.
      </AppText>

      <Divider style={styles.divider} />

      <View style={styles.metrics}>
        <MetricTile
          label="Screen time"
          value={formatDuration(summary.screenTimeMinutes)}
          valueAccessibilityLabel={formatDurationSpoken(summary.screenTimeMinutes)}
          trend={
            <TrendLabel
              change={summary.screenTimeChangePct}
              format={formatPercent}
              higherIsBetter={false}
            />
          }
        />
        <MetricTile
          label="Pickups"
          value={formatNumber(summary.pickups)}
          trend={
            <TrendLabel change={summary.pickupsChangePct} format={formatPercent} higherIsBetter={false} />
          }
        />
        <MetricTile
          label="Phone-free"
          value={formatDuration(summary.longestFocusMinutes)}
          valueAccessibilityLabel={formatDurationSpoken(summary.longestFocusMinutes)}
          caption="longest stretch"
        />
      </View>
      <AppText variant="caption" tone="tertiary" style={styles.footnote}>
        Changes compared with your 7-day average.
      </AppText>
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    progress: {
      marginTop: theme.spacing.md,
    },
    explainer: {
      marginTop: theme.spacing.sm,
    },
    divider: {
      marginVertical: theme.spacing.lg,
    },
    metrics: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    footnote: {
      marginTop: theme.spacing.md,
    },
  });
