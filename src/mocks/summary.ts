import type { DailySummary, DailyUsagePoint } from '@/types/models';
import { toIsoDate } from '@/utils/format';

import { hasCheckedInToday } from './checkIns';
import { daysAgo, simulateLatency } from './helpers';

/** Screen time in minutes for the last 7 days, oldest first. Last value is today. */
export const WEEKLY_SCREEN_TIME = [262, 241, 298, 205, 233, 318, 226];

export function getDailySummary(): Promise<DailySummary> {
  return simulateLatency({
    date: toIsoDate(new Date()),
    focusScore: 72,
    focusScoreChange: 4,
    screenTimeMinutes: WEEKLY_SCREEN_TIME[6],
    screenTimeChangePct: -9,
    pickups: 61,
    pickupsChangePct: -4,
    notifications: 118,
    longestFocusMinutes: 84,
    hasCheckedInToday: hasCheckedInToday(),
  });
}

export function getWeeklyScreenTime(): Promise<DailyUsagePoint[]> {
  return simulateLatency(
    WEEKLY_SCREEN_TIME.map((minutes, index) => ({
      date: toIsoDate(daysAgo(6 - index)),
      screenTimeMinutes: minutes,
    })),
  );
}
