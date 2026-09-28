/**
 * Domain models shared across the app.
 *
 * These mirror the response schemas the FastAPI backend will expose as
 * Pydantic models. Field names are camelCase; on the backend, configure
 * Pydantic with `alias_generator=to_camel` (and `populate_by_name=True`) so
 * the JSON matches these types without any mapping code in the app.
 *
 * Dates are ISO 8601 strings: `YYYY-MM-DD` for dates, full timestamps for
 * date-times.
 */

export type UsageCategory = 'productivity' | 'communication' | 'social' | 'entertainment' | 'other';

export type TimeRange = 'day' | 'week' | 'month';

/** GET /v1/summary/today */
export interface DailySummary {
  date: string;
  /** 0–100, derived from pickups, session length and notification load. */
  focusScore: number;
  /** Points compared with yesterday. */
  focusScoreChange: number;
  screenTimeMinutes: number;
  /** Percent compared with the 7-day average. Negative means less. */
  screenTimeChangePct: number;
  pickups: number;
  pickupsChangePct: number;
  notifications: number;
  longestFocusMinutes: number;
  hasCheckedInToday: boolean;
}

export interface DailyUsagePoint {
  date: string;
  screenTimeMinutes: number;
}

export interface CategoryUsage {
  category: UsageCategory;
  minutes: number;
}

export interface AppUsage {
  id: string;
  appName: string;
  category: UsageCategory;
  minutes: number;
  opens: number;
}

/** One bar in a usage timeline: an hour (day view) or a day (week view). */
export interface UsageBucket {
  key: string;
  label: string;
  minutes: number;
}

/** GET /v1/activity?range= */
export interface ActivityReport {
  range: TimeRange;
  totalMinutes: number;
  dailyAverageMinutes: number;
  pickups: number;
  notifications: number;
  timeline: UsageBucket[];
  categories: CategoryUsage[];
  topApps: AppUsage[];
}

export type InsightKind = 'pattern' | 'correlation' | 'milestone' | 'suggestion';

export interface Insight {
  id: string;
  kind: InsightKind;
  title: string;
  body: string;
  createdAt: string;
  /** Optional headline number, e.g. "38%". */
  metricValue?: string;
  metricLabel?: string;
}

export interface ScorePoint {
  key: string;
  label: string;
  value: number;
}

/** GET /v1/insights?range= */
export interface InsightsReport {
  range: TimeRange;
  averageFocusScore: number;
  focusScoreChange: number;
  /** Average of mood check-ins (1–5), or null with no check-ins. */
  averageMood: number | null;
  checkInCount: number;
  focusTrend: ScorePoint[];
  insights: Insight[];
}

export type Rating = 1 | 2 | 3 | 4 | 5;

export interface CheckIn {
  id: string;
  createdAt: string;
  mood: Rating;
  energy: Rating;
  focus: Rating;
  note?: string;
}

/** POST /v1/check-ins request body. */
export type CheckInCreate = Omit<CheckIn, 'id' | 'createdAt'>;

export type DataSourceStatus = 'connected' | 'notConnected' | 'unavailable';

/** GET /v1/data-sources: which phone signals the user has granted. */
export interface DataSource {
  id: 'appUsage' | 'notifications' | 'motion';
  label: string;
  description: string;
  status: DataSourceStatus;
}

/** GET /v1/me: the signed-in account. */
export interface Account {
  id: string;
  email: string;
  /** IANA time zone, e.g. "America/New_York". Decides what "today" means. */
  timezone: string;
}

/** Returned by sign-up and sign-in. Send `token` as `Authorization: Bearer <token>`. */
export interface AuthResponse {
  token: string;
  account: Account;
}

/** POST /v1/auth/sign-up request body. Passwords are 8–128 characters. */
export interface SignUpRequest {
  email: string;
  password: string;
  timezone: string;
}

/** POST /v1/auth/sign-in request body. `timezone` updates the account's if it changed. */
export interface SignInRequest {
  email: string;
  password: string;
  timezone?: string;
}
