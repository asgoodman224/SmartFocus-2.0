import { useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  AppText,
  AsyncContent,
  Button,
  Card,
  IconBadge,
  ListGroup,
  Screen,
  ScreenHeader,
  Section,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/services';
import { useStyles, type Theme } from '@/theme';
import type { CheckIn } from '@/types/models';

import { CheckInForm } from './components/CheckInForm';
import { CheckInHistoryItem } from './components/CheckInHistoryItem';

export default function CheckInScreen() {
  const recent = useAsync(() => api.getRecentCheckIns(5));
  const [savedCheckIn, setSavedCheckIn] = useState<CheckIn | null>(null);

  const handleSaved = (checkIn: CheckIn) => {
    setSavedCheckIn(checkIn);
    recent.revalidate();
  };

  return (
    <Screen onRefresh={recent.refresh} refreshing={recent.isRefreshing}>
      <ScreenHeader
        title="Check-In"
        subtitle="Rate how you're doing right now. Over time, SmartFocus connects this to your phone habits."
      />

      <Section>
        {savedCheckIn ? (
          <CheckInSaved onStartNew={() => setSavedCheckIn(null)} />
        ) : (
          <CheckInForm onSaved={handleSaved} />
        )}
      </Section>

      <Section title="Recent check-ins">
        <AsyncContent
          state={recent}
          isEmpty={(items) => items.length === 0}
          emptyState={{
            icon: 'calendar-outline',
            title: 'No check-ins yet',
            message: 'Your check-ins will show up here.',
          }}
        >
          {(items) => (
            <ListGroup inset="text">
              {items.map((item) => (
                <CheckInHistoryItem key={item.id} checkIn={item} />
              ))}
            </ListGroup>
          )}
        </AsyncContent>
      </Section>
    </Screen>
  );
}

function CheckInSaved({ onStartNew }: { onStartNew: () => void }) {
  const styles = useStyles(createStyles);

  return (
    <Card padding="xl" style={styles.saved}>
      <IconBadge name="checkmark" tone="success" />
      <AppText variant="headline" accessibilityLiveRegion="polite" style={styles.savedTitle}>
        Check-in saved
      </AppText>
      <AppText variant="callout" tone="secondary">
        Thanks. Check in again anytime something changes.
      </AppText>
      <Button title="New check-in" variant="secondary" size="sm" onPress={onStartNew} style={styles.savedAction} />
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    saved: {
      alignItems: 'flex-start',
    },
    savedTitle: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xxs,
    },
    savedAction: {
      marginTop: theme.spacing.lg,
    },
  });
