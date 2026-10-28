/**
 * Storage: the boundary between the API and the database.
 *
 * Routes and reports only ever call the methods below, so the database side
 * can be built separately (MySQL via `mysql2`). Until it exists,
 * `createMemoryStore()` keeps everything in memory, which is fine for
 * development and tests but forgotten whenever the server restarts.
 *
 * To plug in MySQL: write `createMysqlStore(db)` returning an object with
 * every method below (all async), and use it in `src/server.js`. Run
 * `npm test` against it by changing `test/helpers.js:makeStore`. The tests
 * exercise the whole contract through the API.
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
 *   `distanceMeters` is whole meters. Uploading a date again replaces the
 *   whole record, nulls included.
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
 *   createCheckIn(accountId, { createdAt, mood, energy, focus, note?, kind?, sleepQuality? })
 *       → CheckIn (generates the id; optional fields may be undefined)
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
 * Every per-user record belongs to the account id.
 */

class EmailTakenError extends Error {
  constructor(email) {
    super(`An account already exists for ${email}`);
    this.name = 'EmailTakenError';
  }
}

module.exports = { EmailTakenError };
