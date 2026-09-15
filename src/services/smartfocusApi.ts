import * as mock from '@/mocks';
import type {
  ActivityReport,
  CheckIn,
  CheckInCreate,
  DailySummary,
  DailyUsagePoint,
  DataSource,
  InsightsReport,
  TimeRange,
} from '@/types/models';

import { USE_MOCK_DATA } from './config';
import { request } from './http';

/**
 * Every backend call the app makes goes through this file.
 *
 * Screens import these functions and never call `fetch` or mock data
 * directly. When the FastAPI backend is ready, set EXPO_PUBLIC_USE_MOCK_DATA
 * to "false"; no screen code needs to change as long as the endpoints return
 * the types in `src/types/models.ts`.
 */

export function getDailySummary(): Promise<DailySummary> {
  if (USE_MOCK_DATA) return mock.getDailySummary();
  return request('/v1/summary/today');
}

export function getWeeklyScreenTime(): Promise<DailyUsagePoint[]> {
  if (USE_MOCK_DATA) return mock.getWeeklyScreenTime();
  return request('/v1/usage/daily?days=7');
}

export function getActivityReport(range: TimeRange): Promise<ActivityReport> {
  if (USE_MOCK_DATA) return mock.getActivityReport(range);
  return request(`/v1/activity?range=${range}`);
}

export function getInsightsReport(range: TimeRange): Promise<InsightsReport> {
  if (USE_MOCK_DATA) return mock.getInsightsReport(range);
  return request(`/v1/insights?range=${range}`);
}

export function getRecentCheckIns(limit = 5): Promise<CheckIn[]> {
  if (USE_MOCK_DATA) return mock.getRecentCheckIns(limit);
  return request(`/v1/check-ins?limit=${limit}`);
}

export function createCheckIn(payload: CheckInCreate): Promise<CheckIn> {
  if (USE_MOCK_DATA) return mock.createCheckIn(payload);
  return request('/v1/check-ins', { method: 'POST', body: JSON.stringify(payload) });
}

export function getDataSources(): Promise<DataSource[]> {
  if (USE_MOCK_DATA) return mock.getDataSources();
  return request('/v1/data-sources');
}
