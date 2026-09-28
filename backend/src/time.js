/**
 * Calendar helpers. "Today" and hours always mean the user's own clock, taken
 * from the account's IANA time zone. Dates are `YYYY-MM-DD` strings.
 */
const { DateTime, IANAZone } = require('luxon');

/** True for IANA names like "America/New_York" or "UTC"; false for offsets like "+03:00". */
function isValidTimeZone(name) {
  return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9_+\-/]*$/.test(name) && IANAZone.isValidZone(name);
}

/** The user's current local time. */
function localNow(timezone, now) {
  return DateTime.fromJSDate(now, { zone: timezone });
}

function localToday(timezone, now) {
  return localNow(timezone, now).toISODate();
}

function addDays(isoDate, days) {
  return DateTime.fromISO(isoDate, { zone: 'UTC' }).plus({ days }).toISODate();
}

/** Every date from `first` to `last`, inclusive. */
function dateRange(first, last) {
  const dates = [];
  for (let day = first; day <= last; day = addDays(day, 1)) dates.push(day);
  return dates;
}

/** UTC [start, end) covering local days `first` through `last`. */
function utcBounds(timezone, first, last) {
  const start = DateTime.fromISO(first, { zone: timezone }).startOf('day');
  const end = DateTime.fromISO(addDays(last, 1), { zone: timezone }).startOf('day');
  return [start.toJSDate(), end.toJSDate()];
}

/** 0 → "12 AM", 13 → "1 PM". */
function hourLabel(hour) {
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** "2026-09-15" → "Tue" */
function weekdayLabel(isoDate) {
  return DateTime.fromISO(isoDate).setLocale('en-US').toFormat('ccc');
}

/** "2026-09-01" → "Sep 1" */
function monthDayLabel(isoDate) {
  return DateTime.fromISO(isoDate).setLocale('en-US').toFormat('LLL d');
}

module.exports = {
  isValidTimeZone,
  localNow,
  localToday,
  addDays,
  dateRange,
  utcBounds,
  hourLabel,
  weekdayLabel,
  monthDayLabel,
};
