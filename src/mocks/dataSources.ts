import type { DataSource } from '@/types/models';

import { simulateLatency } from './helpers';

export function getDataSources(): Promise<DataSource[]> {
  return simulateLatency([
    {
      id: 'appUsage',
      label: 'App usage',
      description: 'Time spent in apps and how often you pick up your phone.',
      status: 'connected',
    },
    {
      id: 'notifications',
      label: 'Notification activity',
      description: 'How many notifications you receive. Never their content.',
      status: 'connected',
    },
    {
      id: 'motion',
      label: 'Physical activity',
      description: "Steps and movement from your phone's motion sensors.",
      status: 'notConnected',
    },
  ]);
}
