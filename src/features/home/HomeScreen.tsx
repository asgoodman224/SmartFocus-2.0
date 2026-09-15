import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { InsightCard } from '@/components/data';
import { AsyncContent, Card, ListRow, Screen, ScreenHeader, Section } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useRevalidateOnFocus } from '@/hooks/useRevalidateOnFocus';
import { api } from '@/services';
import { useStyles, type Theme } from '@/theme';
import { formatLongDate, getGreeting } from '@/utils/format';

import { TodaySummaryCard } from './components/TodaySummaryCard';
import { WeeklyScreenTimeCard } from './components/WeeklyScreenTimeCard';

export default function HomeScreen() {
  const router = useRouter();
  const styles = useStyles(createStyles);

  const summary = useAsync(() => api.getDailySummary());
  const weekly = useAsync(() => api.getWeeklyScreenTime());
  const insights = useAsync(() => api.getInsightsReport('week'));

  // Hides the check-in prompt after the user checks in on the Check-In tab.
  useRevalidateOnFocus(summary.revalidate);

  const refreshAll = () => {
    summary.refresh();
    weekly.refresh();
    insights.refresh();
  };

  return (
    <Screen onRefresh={refreshAll} refreshing={summary.isRefreshing}>
      <ScreenHeader eyebrow={formatLongDate()} title={getGreeting()} />

      <Section title="Today">
        <AsyncContent state={summary}>
          {(data) => (
            <View style={styles.stack}>
              <TodaySummaryCard summary={data} />
              {!data.hasCheckedInToday && (
                <Card padding="none">
                  <ListRow
                    icon="create-outline"
                    iconTone="accent"
                    title="How are you feeling today?"
                    subtitle="A 30-second check-in connects your habits to how you feel."
                    showChevron
                    onPress={() => router.navigate('/check-in')}
                  />
                </Card>
              )}
            </View>
          )}
        </AsyncContent>
      </Section>

      <Section
        title="Screen time"
        description="Last 7 days"
        action={{ label: 'Details', onPress: () => router.navigate('/activity') }}
      >
        <AsyncContent state={weekly}>{(days) => <WeeklyScreenTimeCard days={days} />}</AsyncContent>
      </Section>

      <Section
        title="Latest insight"
        action={{ label: 'All insights', onPress: () => router.navigate('/insights') }}
      >
        <AsyncContent
          state={insights}
          isEmpty={(report) => report.insights.length === 0}
          emptyState={{
            icon: 'bulb-outline',
            title: 'No insights yet',
            message: 'Insights appear after a few days of phone data and check-ins.',
          }}
        >
          {(report) => <InsightCard insight={report.insights[0]} />}
        </AsyncContent>
      </Section>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    stack: {
      gap: theme.spacing.md,
    },
  });
