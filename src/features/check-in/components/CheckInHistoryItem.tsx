import { StyleSheet, View } from 'react-native';

import { AppText, Tag } from '@/components/ui';
import { useStyles, type Theme } from '@/theme';
import type { CheckIn } from '@/types/models';
import { formatRelativeDay, formatTime } from '@/utils/format';

export function CheckInHistoryItem({ checkIn }: { checkIn: CheckIn }) {
  const styles = useStyles(createStyles);

  return (
    <View style={styles.item}>
      <View style={styles.header}>
        <AppText variant="subhead">{formatRelativeDay(checkIn.createdAt)}</AppText>
        <AppText variant="footnote" tone="tertiary">
          {formatTime(checkIn.createdAt)}
        </AppText>
      </View>
      <View style={styles.ratings}>
        <Tag label={`Mood ${checkIn.mood}/5`} />
        <Tag label={`Energy ${checkIn.energy}/5`} />
        <Tag label={`Focus ${checkIn.focus}/5`} />
      </View>
      {checkIn.note && (
        <AppText variant="callout" tone="secondary">
          {checkIn.note}
        </AppText>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    item: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    ratings: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
  });
