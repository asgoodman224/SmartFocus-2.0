/**
 * Builds the read-only reports (summary, activity, insights) from stored days.
 *
 * All windows are in the user's local calendar days and end on (and include)
 * "today". Days with no uploaded usage are treated as missing, not as zero,
 * so averages and comparisons only use days the phone actually reported.
 */
const { focusScore } = require('./focus');
const time = require('./time');

const RANGE_DAYS = { day: 1, week: 7, month: 28 };
const TOP_APPS_LIMIT = 6;

const sum = (values) => values.reduce((total, value) => total + value, 0);
const mean = (values) => sum(values) / values.length;
const toMinutes = (seconds) => Math.round(seconds / 60);

function pctChange(current, baseline) {
  if (!baseline) return 0;
  return Math.round(((current - baseline) / baseline) * 100);
}

/**
 * Totals for one day. `throughHour` limits them to hours 0..throughHour, to
 * compare a partial "today" with the same part of earlier days.
 */
function dayStats(day, throughHour = 23) {
  const hours = day.hours.filter((h) => h.hour <= throughHour);
  const stats = {
    screenSeconds: sum(hours.flatMap((h) => h.apps.map((a) => a.seconds))),
    pickups: sum(hours.map((h) => h.pickups)),
    notifications: sum(hours.map((h) => h.notifications)),
    longestFocusMinutes: day.longestFocusMinutes,
  };
  stats.focusScore = focusScore(stats);
  return stats;
}

/** `{ [date]: stats }` for every day in the window that has uploaded usage. */
async function loadDayStats(store, accountId, first, last, throughHour) {
  const days = await store.getUsageDays(accountId, first, last);
  return Object.fromEntries(days.map((day) => [day.date, dayStats(day, throughHour)]));
}

async function dailySummary(store, account, now) {
  const today = time.localToday(account.timezone, now);
  const yesterdayDate = time.addDays(today, -1);
  const stats = await loadDayStats(store, account.id, yesterdayDate, today);
  const current = stats[today];
  const yesterday = stats[yesterdayDate];
  // Today is only partly over, so compare it with the same hours of the last week.
  const previousWeek = Object.values(
    await loadDayStats(
      store,
      account.id,
      time.addDays(today, -7),
      yesterdayDate,
      time.localNow(account.timezone, now).hour,
    ),
  );

  const [start, end] = time.utcBounds(account.timezone, today, today);
  const hasCheckedInToday = (await store.listCheckInsBetween(account.id, start, end)).length > 0;

  if (!current) {
    // Nothing uploaded yet today. The app's type has no nulls here, so zeros.
    return {
      date: today,
      focusScore: 0,
      focusScoreChange: 0,
      screenTimeMinutes: 0,
      screenTimeChangePct: 0,
      pickups: 0,
      pickupsChangePct: 0,
      notifications: 0,
      longestFocusMinutes: 0,
      hasCheckedInToday,
    };
  }

  const average = (key) => (previousWeek.length ? mean(previousWeek.map((s) => s[key])) : null);
  return {
    date: today,
    focusScore: current.focusScore,
    focusScoreChange: yesterday ? current.focusScore - yesterday.focusScore : 0,
    screenTimeMinutes: toMinutes(current.screenSeconds),
    screenTimeChangePct: pctChange(current.screenSeconds, average('screenSeconds')),
    pickups: current.pickups,
    pickupsChangePct: pctChange(current.pickups, average('pickups')),
    notifications: current.notifications,
    longestFocusMinutes: current.longestFocusMinutes,
    hasCheckedInToday,
  };
}

/** Screen time for the last `days` days, oldest first. Missing days are 0. */
async function dailyUsage(store, account, now, days) {
  const today = time.localToday(account.timezone, now);
  const first = time.addDays(today, -(days - 1));
  const stats = await loadDayStats(store, account.id, first, today);
  return time.dateRange(first, today).map((date) => ({
    date,
    screenTimeMinutes: stats[date] ? toMinutes(stats[date].screenSeconds) : 0,
  }));
}

async function activityReport(store, account, now, range) {
  const today = time.localToday(account.timezone, now);
  const first = time.addDays(today, -(RANGE_DAYS[range] - 1));
  const days = await store.getUsageDays(account.id, first, today);
  const stats = Object.fromEntries(days.map((day) => [day.date, dayStats(day)]));
  const apps = days.flatMap((day) => day.hours.flatMap((h) => h.apps.map((app) => ({ ...app, hour: h.hour }))));

  let timeline;
  if (range === 'day') {
    const byHour = new Array(24).fill(0);
    for (const app of apps) byHour[app.hour] += app.seconds;
    timeline = byHour.map((seconds, hour) => ({
      key: String(hour),
      label: time.hourLabel(hour),
      minutes: toMinutes(seconds),
    }));
  } else {
    const label = range === 'week' ? time.weekdayLabel : time.monthDayLabel;
    timeline = time.dateRange(first, today).map((date) => ({
      key: date,
      label: label(date),
      minutes: stats[date] ? toMinutes(stats[date].screenSeconds) : 0,
    }));
  }

  const byCategory = new Map();
  const byApp = new Map();
  for (const app of apps) {
    byCategory.set(app.category, (byCategory.get(app.category) ?? 0) + app.seconds);
    const total = byApp.get(app.appId) ?? { id: app.appId, appName: app.appName, category: app.category, seconds: 0, opens: 0 };
    total.seconds += app.seconds;
    total.opens += app.opens;
    byApp.set(app.appId, total);
  }
  const bySecondsDesc = (a, b) => b.seconds - a.seconds || (a.id ?? a.category).localeCompare(b.id ?? b.category);

  const dayList = Object.values(stats);
  const totalSeconds = sum(dayList.map((s) => s.screenSeconds));
  return {
    range,
    totalMinutes: toMinutes(totalSeconds),
    dailyAverageMinutes: dayList.length ? toMinutes(totalSeconds / dayList.length) : 0,
    pickups: sum(dayList.map((s) => s.pickups)),
    notifications: sum(dayList.map((s) => s.notifications)),
    timeline,
    categories: [...byCategory]
      .map(([category, seconds]) => ({ category, seconds }))
      .sort(bySecondsDesc)
      .map(({ category, seconds }) => ({ category, minutes: toMinutes(seconds) })),
    topApps: [...byApp.values()]
      .sort(bySecondsDesc)
      .slice(0, TOP_APPS_LIMIT)
      .map(({ seconds, ...app }) => ({ ...app, minutes: toMinutes(seconds) })),
  };
}

async function insightsReport(store, account, now, range) {
  const today = time.localToday(account.timezone, now);
  const length = RANGE_DAYS[range];
  const first = time.addDays(today, -(length - 1));
  const previousFirst = time.addDays(first, -length);

  const stats = await loadDayStats(store, account.id, previousFirst, today);
  const scores = {};
  const previousScores = [];
  for (const [date, s] of Object.entries(stats)) {
    if (date >= first) scores[date] = s.focusScore;
    else previousScores.push(s.focusScore);
  }
  const current = Object.values(scores);
  const average = current.length ? Math.round(mean(current)) : 0;
  const change = current.length && previousScores.length ? average - Math.round(mean(previousScores)) : 0;

  let focusTrend;
  if (range === 'month') {
    // One point per week, oldest first, averaging the days that have data.
    focusTrend = [];
    for (let week = 0; week < length / 7; week++) {
      const weekStart = time.addDays(first, week * 7);
      const values = time
        .dateRange(weekStart, time.addDays(weekStart, 6))
        .filter((date) => date in scores)
        .map((date) => scores[date]);
      if (values.length) {
        focusTrend.push({ key: weekStart, label: time.monthDayLabel(weekStart), value: Math.round(mean(values)) });
      }
    }
  } else {
    focusTrend = time
      .dateRange(first, today)
      .filter((date) => date in scores)
      .map((date) => ({ key: date, label: time.weekdayLabel(date), value: scores[date] }));
  }

  const [start, end] = time.utcBounds(account.timezone, first, today);
  const checkIns = await store.listCheckInsBetween(account.id, start, end);
  return {
    range,
    averageFocusScore: average,
    focusScoreChange: change,
    averageMood: checkIns.length ? Math.round(mean(checkIns.map((c) => c.mood)) * 10) / 10 : null,
    checkInCount: checkIns.length,
    focusTrend,
    // TODO: generate written insights (patterns, correlations, milestones).
    // The app shows a friendly empty state until then.
    insights: [],
  };
}

module.exports = { dailySummary, dailyUsage, activityReport, insightsReport };
