/**
 * Four weeks of sample data for local development (DEMO_ACCOUNT=true).
 * Sign in as demo@smartfocus.dev / smartfocus-demo. The numbers loosely follow
 * the mobile app's mock data so both look alike.
 */
const { DateTime } = require('luxon');

const auth = require('./auth');
const time = require('./time');

const EMAIL = 'demo@smartfocus.dev';
const PASSWORD = 'smartfocus-demo';
const DAYS = 28;

// Relative phone use in each local hour, midnight first.
const HOUR_WEIGHTS = [2, 0, 0, 0, 0, 0, 4, 14, 12, 10, 9, 8, 16, 11, 9, 10, 12, 14, 18, 22, 24, 17, 10, 4];
const WEIGHT_TOTAL = HOUR_WEIGHTS.reduce((total, weight) => total + weight, 0);

// [app id, name, category, share of screen time, minutes per open]
const APPS = [
  ['instagram', 'Instagram', 'social', 0.18, 2.3],
  ['youtube', 'YouTube', 'entertainment', 0.15, 6.0],
  ['slack', 'Slack', 'productivity', 0.13, 1.5],
  ['messages', 'Messages', 'communication', 0.12, 1.1],
  ['reddit', 'Reddit', 'social', 0.08, 2.2],
  ['gmail', 'Gmail', 'productivity', 0.06, 1.3],
  ['whatsapp', 'WhatsApp', 'communication', 0.08, 1.2],
  ['notion', 'Notion', 'productivity', 0.07, 4.0],
  ['spotify', 'Spotify', 'entertainment', 0.06, 3.0],
  ['safari', 'Safari', 'other', 0.07, 2.5],
];

const NOTES = [
  'Productive study session in the library.',
  'Stayed up too late scrolling.',
  'Long day of classes.',
  'Went for a run, felt good.',
];

/** Small seeded random generator, so the sample data is the same every run. */
function random(seed) {
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
  return {
    uniform: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (probability) => next() < probability,
    pick: (items) => items[Math.floor(next() * items.length)],
  };
}

async function addDemoAccount(store, { now = new Date(), timezone = 'America/New_York' } = {}) {
  const rng = random(42);
  const account = await store.createAccount({
    email: EMAIL,
    passwordHash: await auth.hashPassword(PASSWORD),
    timezone,
  });
  const today = time.localToday(timezone, now);
  const currentHour = time.localNow(timezone, now).hour;

  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
    const date = time.addDays(today, -daysAgo);
    // A gentle downward trend in screen time over the four weeks.
    const dailyMinutes = rng.uniform(200, 320) + daysAgo * 1.2;
    const lastHour = daysAgo === 0 ? currentHour : 23;
    const hours = [];
    for (let hour = 0; hour <= lastHour; hour++) {
      const minutes = ((dailyMinutes * HOUR_WEIGHTS[hour]) / WEIGHT_TOTAL) * rng.uniform(0.6, 1.4);
      const apps = [];
      for (const [appId, appName, category, share, perOpen] of APPS) {
        const seconds = Math.round(minutes * share * rng.uniform(0.3, 1.7) * 60);
        if (seconds < 30) continue;
        apps.push({
          appId,
          appName,
          category,
          seconds: Math.min(seconds, 3600),
          opens: Math.max(1, Math.round(seconds / 60 / perOpen)),
        });
      }
      hours.push({
        hour,
        pickups: Math.round(minutes * rng.uniform(0.2, 0.35)),
        notifications: Math.round(minutes * rng.uniform(0.35, 0.7)) + rng.int(0, 2),
        apps,
      });
    }
    await store.replaceUsageDay(account.id, { date, longestFocusMinutes: rng.int(35, 110), hours });

    if (daysAgo > 0 && rng.chance(0.7)) {
      const createdAt = DateTime.fromISO(date, { zone: timezone })
        .set({ hour: rng.int(19, 22), minute: rng.int(0, 59) })
        .toJSDate();
      const note = rng.chance(0.4) ? rng.pick(NOTES) : undefined;
      await store.createCheckIn(account.id, {
        createdAt,
        mood: rng.int(2, 5),
        energy: rng.int(1, 5),
        focus: rng.int(2, 5),
        note,
      });
    }
  }
  for (const sourceId of ['appUsage', 'notifications']) {
    await store.setDataSourceStatus(account.id, sourceId, 'connected');
  }
  return account;
}

module.exports = { addDemoAccount, EMAIL, PASSWORD };
