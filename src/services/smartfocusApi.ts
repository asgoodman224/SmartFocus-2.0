import * as mock from '@/mocks';
import type {
  Account,
  ActivityReport,
  AuthResponse,
  CheckIn,
  CheckInCreate,
  DailySummary,
  DailyUsagePoint,
  DataSource,
  InsightsReport,
  SignInRequest,
  SignUpRequest,
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

// --- Account ---------------------------------------------------------------
// Sign-in state (the saved token) is managed by `src/features/auth`; these
// only make the calls.

export function signUp(payload: SignUpRequest): Promise<AuthResponse> {
  if (USE_MOCK_DATA) return mock.signUp(payload);
  return request('/v1/auth/sign-up', { method: 'POST', body: JSON.stringify(payload) });
}

export function signIn(payload: SignInRequest): Promise<AuthResponse> {
  if (USE_MOCK_DATA) return mock.signIn(payload);
  return request('/v1/auth/sign-in', { method: 'POST', body: JSON.stringify(payload) });
}

export function signOut(): Promise<void> {
  if (USE_MOCK_DATA) return mock.signOut();
  return request('/v1/auth/sign-out', { method: 'POST' });
}

export function getAccount(): Promise<Account> {
  if (USE_MOCK_DATA) return mock.getAccount();
  return request('/v1/me');
}

export function updateTimezone(timezone: string): Promise<Account> {
  if (USE_MOCK_DATA) return mock.updateTimezone(timezone);
  return request('/v1/me', { method: 'PATCH', body: JSON.stringify({ timezone }) });
}

// --- Data --------------------------------------------------------------------

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
