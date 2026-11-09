/**
 * Storage: the boundary between the API and the database.
 *
 * Routes and reports only ever call the methods below. ./connect.js picks the
 * implementation from the settings: ./mysqlStore.js (tables in
 * ./schema.mysql.sql), ./postgresStore.js (./schema.sql), or ./memoryStore.js,
 * which is fine for development and tests but forgotten on restart.
 * Another database only needs an object with every method below (all async);
 * the tests exercise the whole contract through the API.
 *
 * ---------------------------------------------------------------------------
 * Shapes (JSDoc; dates are "YYYY-MM-DD" strings in the user's local calendar,
 * timestamps are JS Dates in UTC)
 *
 * @typedef {{ id: string, email: string, passwordHash: string, timezone: string }} Account
 *   `email` is stored lowercased and must be unique. `passwordHash` is a
 *   ~150-character string. `timezone` is an IANA name, e.g. "America/New_York".
 *
 * @typedef {{ tokenHash: string, accountId: string, createdAt: Date, expiresAt: Date }} Session
 *   `tokenHash` is a 64-character hex SHA-256 (the token itself is never stored).
 *
 * @typedef {'morning' | 'midday' | 'evening' | 'anytime'} CheckInKind
 * @typedef {{
 *   id: string, createdAt: Date, mood: number, energy: number, focus: number,
 *   note?: string, kind?: CheckInKind, sleepQuality?: number
 * }} CheckIn
 *   Ratings (mood, energy, focus, sleepQuality) are 1–5. `note` is at most
 *   280 characters. `note`, `kind` and `sleepQuality` are optional: absent
 *   (not null) when not given, so store them as nullable columns and leave
 *   them out of the returned object when NULL. `createdAt` is when the user
 *   checked in on the phone, which may be up to 30 days before the upload
 *   (offline phones), so it is set by the caller, not by the database.
 *
 * @typedef {'appUsage' | 'notifications' | 'motion'} DataSourceId
 * @typedef {'connected' | 'notConnected' | 'unavailable'} DataSourceStatus
 *
 * @typedef {{ appId: string, appName: string, category: string, seconds: number, opens: number }} AppUsage
 *   `category` is productivity | communication | social | entertainment | other.
 *   `seconds` is 0–3600 (time in that app during that hour).
 * @typedef {{ hour: number, pickups: number, notifications: number, apps: AppUsage[] }} UsageHour
 *   `hour` is 0–23 in the user's local time.
 * @typedef {{ date: string, longestFocusMinutes: number, hours: UsageHour[] }} UsageDay
 *   One uploaded day. Uploading a date again replaces it entirely.
 *
 * @typedef {{
 *   date: string, sleepMinutes: number | null, steps: number | null,
 *   exerciseMinutes: number | null, distanceMeters: number | null
 * }} HealthDay
 *   One local day of health data from the phone. Every value is a
 *   non-negative integer, or null when the phone had no data for it (keep
 *   null distinct from 0). `sleepMinutes` and `exerciseMinutes` are 0–1440;
 *   `distanceMeters` is whole meters. `sleepStart` and `sleepEnd` (Dates or
 *   null) are bedtime and wake time of the night's main sleep. Uploading a
 *   date again replaces the whole record, nulls included.
 *
 * @typedef {{ date: string, score: number | null, body: number | null, mind: number | null, digital: number | null }} WellnessDay
 *   The wellness score (0–100) the app showed that day, and its parts.
 *
 * @typedef {{
 *   installId: string, platform: 'android' | 'ios', manufacturer: string | null,
 *   model: string | null, osVersion: string | null, appVersion: string | null,
 *   firstSeenAt: Date, lastSeenAt: Date
 * }} Device
 *   The phone a participant uses. `lastSeenAt` is the last sync.
 *
 * ---------------------------------------------------------------------------
 * Methods (all return Promises)
 *
 * Accounts
 *   getAccount(accountId)                      → Account | null
 *   getAccountByEmail(email)                   → Account | null   (email already lowercased)
 *   createAccount({ email, passwordHash, timezone }) → Account     (generates the id;
 *       throws EmailTakenError if the email exists, including under a race)
 *   updateAccount(accountId, { passwordHash?, timezone? }) → Account (only given fields)
 *
 * Sessions
 *   createSession(session)                     → void
 *   getSession(tokenHash)                      → Session | null
 *   deleteSession(tokenHash)                   → void   (missing is not an error)
 *
 * Check-ins
 *   createCheckIn(accountId, { createdAt, localDay, mood, energy, focus, note?, kind?, sleepQuality? })
 *       → CheckIn (generates the id; optional fields may be undefined; `localDay`
 *       is the participant's "YYYY-MM-DD", stored for analysis and not returned)
 *   listCheckIns(accountId, limit)             → CheckIn[]  newest createdAt first
 *   listCheckInsBetween(accountId, start, end) → CheckIn[]  createdAt in [start, end)
 *
 * Data sources
 *   getDataSourceStatuses(accountId)           → { [DataSourceId]: DataSourceStatus } (only ones set)
 *   setDataSourceStatus(accountId, sourceId, status) → void
 *
 * Usage
 *   replaceUsageDay(accountId, day)            → void   (day: UsageDay; replaces that date)
 *   getUsageDays(accountId, firstDate, lastDate) → UsageDay[]  dates in [first, last], any order
 *
 * Health
 *   replaceHealthDay(accountId, day)           → void   (day: HealthDay; replaces that date)
 *   getHealthDays(accountId, firstDate, lastDate) → HealthDay[]  dates in [first, last], any order
 *
 * Wellness
 *   replaceWellnessDay(accountId, day)         → void   (day: WellnessDay; replaces that date)
 *   getWellnessDays(accountId, firstDate, lastDate) → WellnessDay[]
 *
 * Devices
 *   saveDevice(accountId, { installId, platform, manufacturer?, model?, osVersion?, appVersion? })
 *       → void (adds the device or updates it, and sets lastSeenAt to now)
 *   listDevices(accountId)                     → Device[]  most recently seen first
 *
 * Every per-user record belongs to the account id.
 */

class EmailTakenError extends Error {
  constructor(email) {
    super(`An account already exists for ${email}`);
    this.name = 'EmailTakenError';
  }
}

module.exports = { EmailTakenError };
