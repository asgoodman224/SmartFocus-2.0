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
 * @typedef {{ id: string, createdAt: Date, mood: number, energy: number, focus: number, note?: string }} CheckIn
 *   Ratings are 1–5. `note` is at most 280 characters, absent when empty.
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
 *   createCheckIn(accountId, { createdAt, mood, energy, focus, note? }) → CheckIn (generates the id)
 *   listCheckIns(accountId, limit)             → CheckIn[]  newest first
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
 * Every per-user record belongs to the account id.
 */

class EmailTakenError extends Error {
  constructor(email) {
    super(`An account already exists for ${email}`);
    this.name = 'EmailTakenError';
  }
}

module.exports = { EmailTakenError };
