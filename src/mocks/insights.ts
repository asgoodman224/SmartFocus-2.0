import type { Insight, InsightsReport, ScorePoint, TimeRange } from '@/types/models';
import { formatWeekdayShort, toIsoDate } from '@/utils/format';

import { daysAgo, daysAgoAt, simulateLatency } from './helpers';

const weekInsights: Insight[] = [
  {
    id: 'evening-usage',
    kind: 'pattern',
    title: 'Evenings are your heaviest phone time',
    body: 'About 38% of your screen time this week happened between 7 and 10 PM, mostly in social and video apps.',
    createdAt: daysAgoAt(0, 7, 30),
    metricValue: '38%',
    metricLabel: 'after 7 PM',
  },
  {
    id: 'pickups-focus',
    kind: 'correlation',
    title: 'Fewer pickups, higher focus',
    body: 'On days with under 55 pickups, your focus score averaged 79, compared with 64 on busier days.',
    createdAt: daysAgoAt(1, 7, 30),
    metricValue: '+15',
    metricLabel: 'focus points',
  },
  {
    id: 'longest-session',
    kind: 'milestone',
    title: 'Longest focus stretch this week',
    body: 'You went 84 minutes without unlocking your phone on Tuesday morning.',
    createdAt: daysAgoAt(2, 12, 10),
  },
  {
    id: 'morning-notifications',
    kind: 'suggestion',
    title: 'Try a quieter first hour',
    body: 'Notifications before 9 AM were followed by roughly twice as many pickups in the next hour. A morning Focus mode could help.',
    createdAt: daysAgoAt(3, 7, 30),
  },
];

const monthInsights: Insight[] = [
  {
    id: 'month-trend',
    kind: 'pattern',
    title: 'Screen time is trending down',
    body: 'Your daily average dropped from 4h 31m to 4h 15m over the last four weeks.',
    createdAt: daysAgoAt(0, 7, 30),
    metricValue: '−16m',
    metricLabel: 'per day',
  },
  {
    id: 'late-night-energy',
    kind: 'correlation',
    title: 'Late-night use and next-day energy',
    body: 'On 7 of the 9 nights with more than 45 minutes of use after 11 PM, you rated your energy 2 or lower the next day.',
    createdAt: daysAgoAt(4, 7, 30),
  },
  weekInsights[2],
];

function weekTrend(): ScorePoint[] {
  return [64, 71, 58, 76, 69, 61, 72].map((value, index) => {
    const date = toIsoDate(daysAgo(6 - index));
    return { key: date, label: formatWeekdayShort(date), value };
  });
}

function monthTrend(): ScorePoint[] {
  return [63, 66, 68, 70].map((value, index) => {
    const weekStart = daysAgo((3 - index) * 7 + 6);
    return {
      key: toIsoDate(weekStart),
      label: weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value,
    };
  });
}

export function getInsightsReport(range: TimeRange): Promise<InsightsReport> {
  if (range === 'month') {
    return simulateLatency({
      range,
      averageFocusScore: 67,
      focusScoreChange: 7,
      averageMood: 3.4,
      checkInCount: 19,
      focusTrend: monthTrend(),
      insights: monthInsights,
    });
  }
  return simulateLatency({
    range,
    averageFocusScore: 67,
    focusScoreChange: 3,
    averageMood: 3.6,
    checkInCount: 5,
    focusTrend: weekTrend(),
    insights: weekInsights,
  });
}
