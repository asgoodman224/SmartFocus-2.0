import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { IconName } from '@/components/ui/Icon';
import { IconBadge } from '@/components/ui/IconBadge';
import { useStyles, type Theme } from '@/theme';
import type { Insight, InsightKind } from '@/types/models';
import { formatRelativeDay } from '@/utils/format';

const KIND_META: Record<InsightKind, { label: string; icon: IconName }> = {
  pattern: { label: 'Pattern', icon: 'analytics-outline' },
  correlation: { label: 'Connection', icon: 'git-compare-outline' },
  milestone: { label: 'Milestone', icon: 'flag-outline' },
  suggestion: { label: 'Suggestion', icon: 'bulb-outline' },
};

export interface InsightCardProps {
  insight: Insight;
}

export function InsightCard({ insight }: InsightCardProps) {
  const styles = useStyles(createStyles);
  const kind = KIND_META[insight.kind];

  return (
    <Card>
      <View style={styles.header}>
        <IconBadge name={kind.icon} tone="accent" />
        <AppText variant="subhead" tone="secondary" style={styles.kind}>
          {kind.label}
        </AppText>
        <AppText variant="footnote" tone="tertiary">
          {formatRelativeDay(insight.createdAt)}
        </AppText>
      </View>

      <AppText variant="headline" style={styles.title}>
        {insight.title}
      </AppText>
      <AppText variant="callout" tone="secondary" style={styles.body}>
        {insight.body}
      </AppText>

      {insight.metricValue && (
        <View style={styles.metric}>
          <AppText variant="title">{insight.metricValue}</AppText>
          {insight.metricLabel && (
            <AppText variant="footnote" tone="secondary">
              {insight.metricLabel}
            </AppText>
          )}
        </View>
      )}
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    kind: {
      flex: 1,
    },
    title: {
      marginTop: theme.spacing.md,
    },
    body: {
      marginTop: theme.spacing.xs,
    },
    metric: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
  });
