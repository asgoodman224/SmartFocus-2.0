import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BarChart, InsightCard, MetricTile, TrendLabel } from '@/components/data';
import {
  AppText,
  AsyncContent,
  Card,
  Divider,
  EmptyState,
  Screen,
  ScreenHeader,
  Section,
  SegmentedControl,
  type SegmentOption,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/services';
import { useStyles, type Theme } from '@/theme';
import type { InsightsReport, TimeRange } from '@/types/models';

type InsightsRange = Extract<TimeRange, 'week' | 'month'>;

const RANGE_OPTIONS: SegmentOption<InsightsRange>[] = [
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 4 weeks' },
];

export default function InsightsScreen() {
  const styles = useStyles(createStyles);
  const [range, setRange] = useState<InsightsRange>('week');
  const report = useAsync(() => api.getInsightsReport(range), [range]);

  return (
    <Screen onRefresh={report.refresh} refreshing={report.isRefreshing}>
      <ScreenHeader title="Insights" subtitle="Patterns in your phone use, focus and check-ins." />
      <SegmentedControl
        options={RANGE_OPTIONS}
        value={range}
        onChange={setRange}
        accessibilityLabel="Time range"
        style={styles.segmented}
      />
      <AsyncContent state={report}>{(data) => <InsightsReportView report={data} />}</AsyncContent>
    </Screen>
  );
}

function InsightsReportView({ report }: { report: InsightsReport }) {
  const styles = useStyles(createStyles);
  const isWeek = report.range === 'week';
  const latest = report.focusTrend[report.focusTrend.length - 1];
  const chartTitle = isWeek ? 'Focus score by day' : 'Focus score by week';

  return (
    <>
      <Section>
        <Card padding="xl">
          <View style={styles.metrics}>
            <MetricTile
              label="Avg. focus score"
              value={String(report.averageFocusScore)}
              trend={
                <TrendLabel
                  change={report.focusScoreChange}
                  format={(n) => `${n} pts`}
                  higherIsBetter
                  context={isWeek ? 'vs. last week' : 'vs. prior 4 weeks'}
                />
              }
            />
            <MetricTile
              label="Avg. mood"
              value={report.averageMood === null ? '–' : report.averageMood.toFixed(1)}
              unit={report.averageMood === null ? undefined : '/ 5'}
              caption={`${report.checkInCount} ${report.checkInCount === 1 ? 'check-in' : 'check-ins'}`}
            />
          </View>

          <Divider style={styles.divider} />

          <AppText variant="subhead" tone="secondary" style={styles.chartTitle}>
            {chartTitle}
          </AppText>
          <BarChart
            data={report.focusTrend}
            maxValue={100}
            highlightKey={latest?.key}
            accessibilityLabel={`${chartTitle}: ${report.focusTrend.map((p) => `${p.label} ${p.value}`).join(', ')}`}
          />
        </Card>
      </Section>

      <Section title="What we noticed">
        {report.insights.length === 0 ? (
          <EmptyState
            icon="bulb-outline"
            title="No insights yet"
            message="Insights appear after a few days of phone data and check-ins."
            compact
          />
        ) : (
          <View style={styles.list}>
            {report.insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </View>
        )}
      </Section>

      <AppText variant="footnote" tone="tertiary" align="center" style={styles.disclaimer}>
        Insights describe patterns in your own data. They are not medical advice.
      </AppText>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    segmented: {
      marginBottom: theme.spacing.xxl,
    },
    metrics: {
      flexDirection: 'row',
      gap: theme.spacing.lg,
    },
    divider: {
      marginVertical: theme.spacing.lg,
    },
    chartTitle: {
      marginBottom: theme.spacing.md,
    },
    list: {
      gap: theme.spacing.md,
    },
    disclaimer: {
      paddingHorizontal: theme.spacing.lg,
    },
  });
