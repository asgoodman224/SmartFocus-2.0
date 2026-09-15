import type { ActivityReport, TimeRange, UsageBucket } from '@/types/models';
import { formatWeekdayShort, toIsoDate } from '@/utils/format';

import { daysAgo, simulateLatency } from './helpers';
import { WEEKLY_SCREEN_TIME } from './summary';

/** Minutes of use in each hour of today, midnight first. Sums to today's total (226). */
const HOURLY_MINUTES = [2, 0, 0, 0, 0, 0, 4, 14, 12, 10, 9, 8, 16, 11, 9, 10, 12, 14, 18, 22, 24, 17, 10, 4];

function hourLabel(hour: number): string {
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour} ${hour < 12 ? 'AM' : 'PM'}`;
}

const dayTimeline: UsageBucket[] = HOURLY_MINUTES.map((minutes, hour) => ({
  key: String(hour),
  label: hourLabel(hour),
  minutes,
}));

function weekTimeline(): UsageBucket[] {
  return WEEKLY_SCREEN_TIME.map((minutes, index) => {
    const date = toIsoDate(daysAgo(6 - index));
    return { key: date, label: formatWeekdayShort(date), minutes };
  });
}

const dayReport: Omit<ActivityReport, 'timeline'> = {
  range: 'day',
  totalMinutes: 226,
  dailyAverageMinutes: 226,
  pickups: 61,
  notifications: 118,
  categories: [
    { category: 'social', minutes: 64 },
    { category: 'productivity', minutes: 58 },
    { category: 'communication', minutes: 49 },
    { category: 'entertainment', minutes: 38 },
    { category: 'other', minutes: 17 },
  ],
  topApps: [
    { id: 'instagram', appName: 'Instagram', category: 'social', minutes: 41, opens: 18 },
    { id: 'slack', appName: 'Slack', category: 'productivity', minutes: 34, opens: 22 },
    { id: 'messages', appName: 'Messages', category: 'communication', minutes: 31, opens: 27 },
    { id: 'youtube', appName: 'YouTube', category: 'entertainment', minutes: 29, opens: 6 },
    { id: 'reddit', appName: 'Reddit', category: 'social', minutes: 17, opens: 9 },
    { id: 'gmail', appName: 'Gmail', category: 'productivity', minutes: 14, opens: 11 },
  ],
};

const weekReport: Omit<ActivityReport, 'timeline'> = {
  range: 'week',
  totalMinutes: 1783,
  dailyAverageMinutes: 255,
  pickups: 438,
  notifications: 842,
  categories: [
    { category: 'social', minutes: 521 },
    { category: 'productivity', minutes: 402 },
    { category: 'entertainment', minutes: 377 },
    { category: 'communication', minutes: 356 },
    { category: 'other', minutes: 127 },
  ],
  topApps: [
    { id: 'instagram', appName: 'Instagram', category: 'social', minutes: 312, opens: 131 },
    { id: 'youtube', appName: 'YouTube', category: 'entertainment', minutes: 268, opens: 44 },
    { id: 'slack', appName: 'Slack', category: 'productivity', minutes: 221, opens: 149 },
    { id: 'messages', appName: 'Messages', category: 'communication', minutes: 204, opens: 183 },
    { id: 'reddit', appName: 'Reddit', category: 'social', minutes: 139, opens: 62 },
    { id: 'gmail', appName: 'Gmail', category: 'productivity', minutes: 97, opens: 74 },
  ],
};

export function getActivityReport(range: TimeRange): Promise<ActivityReport> {
  const report =
    range === 'day'
      ? { ...dayReport, timeline: dayTimeline }
      : { ...weekReport, range, timeline: weekTimeline() };
  return simulateLatency(report);
}
