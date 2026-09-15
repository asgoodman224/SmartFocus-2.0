import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BarChart, CategoryBreakdown, MetricTile } from '@/components/data';
import {
  AppText,
  AsyncContent,
  Card,
  Divider,
  ListGroup,
  Screen,
  ScreenHeader,
  Section,
  SegmentedControl,
  type SegmentOption,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/services';
import { useStyles, type Theme } from '@/theme';
import type { ActivityReport, TimeRange, UsageBucket } from '@/types/models';
import { formatDuration, formatDurationSpoken, formatNumber } from '@/utils/format';

import { AppUsageRow } from './components/AppUsageRow';

type ActivityRange = Extract<TimeRange, 'day' | 'week'>;

const RANGE_OPTIONS: SegmentOption<ActivityRange>[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
];

export default function ActivityScreen() {
  const styles = useStyles(createStyles);
  const [range, setRange] = useState<ActivityRange>('day');
  const report = useAsync(() => api.getActivityReport(range), [range]);

  return (
    <Screen onRefresh={report.refresh} refreshing={report.isRefreshing}>
      <ScreenHeader title="Activity" subtitle="How and when you use your phone." />
      <SegmentedControl
        options={RANGE_OPTIONS}
        value={range}
        onChange={setRange}
        accessibilityLabel="Time range"
        style={styles.segmented}
      />
      <AsyncContent
        state={report}
        isEmpty={(data) => data.totalMinutes === 0}
        emptyState={{
          icon: 'phone-portrait-outline',
          title: 'No activity yet',
          message: 'App usage appears here once SmartFocus has collected some data.',
        }}
      >
        {(data) => <ActivityReportView report={data} />}
      </AsyncContent>
    </Screen>
  );
}

function ActivityReportView({ report }: { report: ActivityReport }) {
  const styles = useStyles(createStyles);
  const isDay = report.range === 'day';

  const headline = isDay ? report.totalMinutes : report.dailyAverageMinutes;
  const topAppMinutes = report.topApps[0]?.minutes ?? 0;
  const peak = report.timeline.reduce<UsageBucket | undefined>(
    (best, bucket) => (!best || bucket.minutes > best.minutes ? bucket : best),
    undefined,
  );

  return (
    <>
      <Section>
        <Card padding="xl">
          <MetricTile
            size="lg"
            label={isDay ? 'Screen time' : 'Daily average'}
            value={formatDuration(headline)}
            valueAccessibilityLabel={formatDurationSpoken(headline)}
            caption={isDay ? undefined : `${formatDuration(report.totalMinutes)} total`}
          />
          <View style={styles.metrics}>
            <MetricTile label="Pickups" value={formatNumber(report.pickups)} />
            <MetricTile label="Notifications" value={formatNumber(report.notifications)} />
          </View>

          <Divider style={styles.divider} />

          <View style={styles.chartHeader}>
            <AppText variant="subhead" tone="secondary">
              {isDay ? 'By hour' : 'By day'}
            </AppText>
            {peak && (
              <AppText variant="footnote" tone="tertiary">
                Peak {peak.label} · {formatDuration(peak.minutes)}
              </AppText>
            )}
          </View>
          <BarChart
            data={report.timeline.map((b) => ({ key: b.key, label: b.label, value: b.minutes }))}
            highlightKey={peak?.key}
            labelEvery={isDay ? 6 : 1}
            height={isDay ? 96 : 120}
            accessibilityLabel={
              peak
                ? `Screen time ${isDay ? 'by hour' : 'by day'}. Peak ${peak.label} with ${formatDurationSpoken(peak.minutes)}.`
                : 'Screen time chart'
            }
          />
        </Card>
      </Section>

      <Section title="Categories">
        <Card padding="xl">
          <CategoryBreakdown categories={report.categories} />
        </Card>
      </Section>

      <Section title="Most used apps">
        <ListGroup>
          {report.topApps.map((app) => (
            <AppUsageRow key={app.id} app={app} maxMinutes={topAppMinutes} />
          ))}
        </ListGroup>
      </Section>
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
      marginTop: theme.spacing.lg,
    },
    divider: {
      marginVertical: theme.spacing.lg,
    },
    chartHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
  });
