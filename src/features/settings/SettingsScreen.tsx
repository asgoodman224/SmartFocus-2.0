import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  AsyncContent,
  ListGroup,
  ListRow,
  Screen,
  ScreenHeader,
  Section,
  SegmentedControl,
  Tag,
  Toggle,
  type IconName,
  type SegmentOption,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/services';
import { USE_MOCK_DATA } from '@/services/config';
import { useThemePreference, type ThemePreference, type Tone } from '@/theme';
import type { DataSource, DataSourceStatus } from '@/types/models';

const APPEARANCE_OPTIONS: SegmentOption<ThemePreference>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const DATA_SOURCE_ICONS: Record<DataSource['id'], IconName> = {
  appUsage: 'phone-portrait-outline',
  notifications: 'notifications-outline',
  motion: 'walk-outline',
};

const STATUS_TAGS: Record<DataSourceStatus, { label: string; tone: Tone }> = {
  connected: { label: 'On', tone: 'success' },
  notConnected: { label: 'Off', tone: 'neutral' },
  unavailable: { label: 'Unavailable', tone: 'neutral' },
};

// TODO: replace these alerts with real flows once the backend supports them.
function showNotAvailableYet(feature: string) {
  Alert.alert(feature, 'This will be available once SmartFocus is connected to its server.');
}

function confirmDeleteData() {
  Alert.alert(
    'Delete all data?',
    'This permanently removes your usage history, check-ins and insights. It cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => showNotAvailableYet('Delete data') },
    ],
  );
}

export default function SettingsScreen() {
  const { preference, setPreference } = useThemePreference();
  const dataSources = useAsync(() => api.getDataSources());

  // Local only for now; these will be saved to the user's profile via the API.
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);

  return (
    <Screen onRefresh={dataSources.refresh} refreshing={dataSources.isRefreshing}>
      <ScreenHeader title="Settings" />

      <Section title="Appearance">
        <SegmentedControl
          options={APPEARANCE_OPTIONS}
          value={preference}
          onChange={setPreference}
          accessibilityLabel="Appearance"
        />
      </Section>

      <Section title="Data sources" description="SmartFocus only reads the signals you turn on.">
        <AsyncContent state={dataSources}>
          {(sources) => (
            <ListGroup>
              {sources.map((source) => (
                <ListRow
                  key={source.id}
                  icon={DATA_SOURCE_ICONS[source.id]}
                  title={source.label}
                  subtitle={source.description}
                  trailing={<Tag {...STATUS_TAGS[source.status]} />}
                />
              ))}
            </ListGroup>
          )}
        </AsyncContent>
      </Section>

      <Section title="Notifications">
        <ListGroup>
          <ListRow
            icon="alarm-outline"
            title="Daily check-in reminder"
            subtitle="Every day at 8:00 PM"
            trailing={
              <Toggle
                value={dailyReminder}
                onValueChange={setDailyReminder}
                accessibilityLabel="Daily check-in reminder"
              />
            }
          />
          <ListRow
            icon="calendar-outline"
            title="Weekly summary"
            subtitle="Sunday mornings"
            trailing={
              <Toggle value={weeklySummary} onValueChange={setWeeklySummary} accessibilityLabel="Weekly summary" />
            }
          />
        </ListGroup>
      </Section>

      <Section title="Privacy">
        <ListGroup>
          <ListRow
            icon="download-outline"
            title="Export my data"
            showChevron
            onPress={() => showNotAvailableYet('Export data')}
          />
          <ListRow icon="trash-outline" title="Delete my data" destructive onPress={confirmDeleteData} />
        </ListGroup>
      </Section>

      <Section title="About">
        <ListGroup inset="text">
          <ListRow title="Version" value={Constants.expoConfig?.version ?? '–'} />
          <ListRow title="Data" value={USE_MOCK_DATA ? 'Sample data' : 'Live'} />
        </ListGroup>
      </Section>
    </Screen>
  );
}
