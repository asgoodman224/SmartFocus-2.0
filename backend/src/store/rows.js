/**
 * Conversions between API records and the SQL tables (schema.sql), shared by
 * the PostgreSQL and MySQL stores.
 */
const { randomUUID } = require('node:crypto');

const newId = () => randomUUID().replaceAll('-', '');

const toAccount = (row) =>
  row ? { id: row.id, email: row.email, passwordHash: row.password_hash, timezone: row.timezone } : null;

const toSession = (row) =>
  row ? { tokenHash: row.token_hash, accountId: row.account_id, createdAt: row.created_at, expiresAt: row.expires_at } : null;

function toCheckIn(row) {
  const checkIn = { id: row.id, createdAt: row.created_at, mood: row.mood, energy: row.energy, focus: row.focus };
  // Optional fields are left out rather than returned as null.
  if (row.note) checkIn.note = row.note;
  if (row.kind != null) checkIn.kind = row.kind;
  if (row.sleep_quality != null) checkIn.sleepQuality = row.sleep_quality;
  return checkIn;
}

const toHealthDay = (row) => ({
  date: row.day,
  sleepMinutes: row.sleep_minutes,
  steps: row.steps,
  exerciseMinutes: row.exercise_minutes,
  distanceMeters: row.distance_meters,
});

/** A UsageDay's hour and app rows, in upload order. */
function usageRows(day) {
  const hours = day.hours.map(({ hour, pickups, notifications }) => ({ hour, pickups, notifications }));
  const apps = day.hours.flatMap(({ hour, apps: list }) =>
    list.map((a, position) => ({
      hour,
      position,
      app_id: a.appId,
      app_name: a.appName,
      category: a.category,
      seconds: a.seconds,
      opens: a.opens,
    })),
  );
  return { hours, apps };
}

/** Rebuilds UsageDays from usage_days, usage_hours and app_usage rows (sorted by day, hour, position). */
function toUsageDays(dayRows, hourRows, appRows) {
  const byDay = new Map(
    dayRows.map((row) => [row.day, { date: row.day, longestFocusMinutes: row.longest_focus_minutes, hours: [] }]),
  );
  const byHour = new Map();
  for (const row of hourRows) {
    const hour = { hour: row.hour, pickups: row.pickups, notifications: row.notifications, apps: [] };
    byDay.get(row.day).hours.push(hour);
    byHour.set(`${row.day} ${row.hour}`, hour);
  }
  for (const row of appRows) {
    byHour.get(`${row.day} ${row.hour}`).apps.push({
      appId: row.app_id,
      appName: row.app_name,
      category: row.category,
      seconds: row.seconds,
      opens: row.opens,
    });
  }
  return [...byDay.values()];
}

module.exports = { newId, toAccount, toSession, toCheckIn, toHealthDay, usageRows, toUsageDays };
