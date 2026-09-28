const assert = require('node:assert/strict');
const { test } = require('node:test');

const { focusScore } = require('../src/focus');
const { TODAY, appEntry, daysBefore, hourEntry, signedInClient, uploadDay } = require('./helpers');

const YESTERDAY = daysBefore(TODAY, 1);

test('summary with no data is all zeros', async () => {
  const client = await signedInClient();
  const { body } = await client.get('/v1/summary/today');

  assert.equal(body.date, '2026-09-15');
  assert.equal(body.screenTimeMinutes, 0);
  assert.equal(body.focusScore, 0);
  assert.equal(body.hasCheckedInToday, false);
});

test("summary totals today's usage", async () => {
  const client = await signedInClient();
  await uploadDay(
    client,
    TODAY,
    [
      hourEntry(8, { pickups: 5, notifications: 10, apps: [appEntry('instagram', 1200)] }),
      hourEntry(9, { pickups: 3, notifications: 4, apps: [appEntry('slack', 600)] }),
    ],
    { longestFocusMinutes: 45 },
  );

  const { body } = await client.get('/v1/summary/today');

  assert.equal(body.screenTimeMinutes, 30);
  assert.equal(body.pickups, 8);
  assert.equal(body.notifications, 14);
  assert.equal(body.longestFocusMinutes, 45);
  assert.equal(body.focusScore, focusScore({ pickups: 8, notifications: 14, longestFocusMinutes: 45 }));
});

test('summary compares with the same hours of previous days', async () => {
  const client = await signedInClient();
  // It's noon. Yesterday had 20 minutes before noon and a lot more after.
  await uploadDay(client, YESTERDAY, [
    hourEntry(9, { pickups: 10, apps: [appEntry('instagram', 1200)] }),
    hourEntry(20, { pickups: 40, apps: [appEntry('youtube', 3600)] }),
  ]);
  await uploadDay(client, TODAY, [hourEntry(9, { pickups: 5, apps: [appEntry('instagram', 1800)] })]);

  const { body } = await client.get('/v1/summary/today');

  assert.equal(body.screenTimeChangePct, 50); // 30 min vs 20 min by noon
  assert.equal(body.pickupsChangePct, -50); // 5 vs 10 by noon
});

test('hasCheckedInToday uses the local day', async () => {
  const client = await signedInClient();
  // 11:30 PM New York time on the 14th is already the 15th in UTC.
  client.clock.now = new Date('2026-09-15T03:30:00Z');
  await client.post('/v1/check-ins', { mood: 3, energy: 3, focus: 3 });
  client.clock.now = new Date('2026-09-15T16:00:00Z');

  assert.equal((await client.get('/v1/summary/today')).body.hasCheckedInToday, false);

  await client.post('/v1/check-ins', { mood: 3, energy: 3, focus: 3 });
  assert.equal((await client.get('/v1/summary/today')).body.hasCheckedInToday, true);
});

test('an upload replaces the previous upload for that day', async () => {
  const client = await signedInClient();
  await uploadDay(client, TODAY, [hourEntry(8, { pickups: 5, apps: [appEntry('instagram', 1200)] })]);
  await uploadDay(client, TODAY, [hourEntry(9, { pickups: 2, apps: [appEntry('slack', 600)] })]);

  const { body } = await client.get('/v1/activity?range=day');

  assert.equal(body.totalMinutes, 10);
  assert.equal(body.pickups, 2);
  assert.deepEqual(body.topApps.map((a) => a.id), ['slack']);
});

test('upload validation', async () => {
  const client = await signedInClient();
  const put = (date, hours) => client.put(`/v1/usage/days/${date}`, { longestFocusMinutes: 10, hours });

  assert.equal((await put(daysBefore(TODAY, -1), [])).status, 422); // tomorrow
  assert.equal((await put('not-a-date', [])).status, 422);
  assert.equal((await put(TODAY, [hourEntry(8), hourEntry(8)])).status, 422);
  assert.equal((await put(TODAY, [hourEntry(24)])).status, 422);
  assert.equal((await put(TODAY, [hourEntry(8, { apps: [appEntry('a', 60), appEntry('a', 60)] })])).status, 422);
  assert.equal((await put(TODAY, [hourEntry(8, { apps: [appEntry('a', 3601)] })])).status, 422);
  assert.equal((await put(TODAY, [hourEntry(8, { apps: [appEntry('a', 60)] })])).status, 204);
});

test('daily usage fills missing days with zero', async () => {
  const client = await signedInClient();
  await uploadDay(client, daysBefore(TODAY, 2), [hourEntry(10, { apps: [appEntry('a', 600)] })]);
  await uploadDay(client, TODAY, [hourEntry(10, { apps: [appEntry('a', 300)] })]);

  const { body } = await client.get('/v1/usage/daily?days=3');

  assert.deepEqual(body, [
    { date: '2026-09-13', screenTimeMinutes: 10 },
    { date: '2026-09-14', screenTimeMinutes: 0 },
    { date: '2026-09-15', screenTimeMinutes: 5 },
  ]);
});

test('activity report for today', async () => {
  const client = await signedInClient();
  await uploadDay(client, TODAY, [
    hourEntry(8, {
      pickups: 4,
      notifications: 6,
      apps: [appEntry('instagram', 900, { opens: 3 }), appEntry('slack', 1800, { category: 'productivity', opens: 2 })],
    }),
    hourEntry(9, { pickups: 1, apps: [appEntry('instagram', 900, { opens: 1 })] }),
  ]);

  const { body } = await client.get('/v1/activity?range=day');

  assert.equal(body.range, 'day');
  assert.equal(body.totalMinutes, 60);
  assert.equal(body.dailyAverageMinutes, 60);
  assert.equal(body.pickups, 5);
  assert.equal(body.notifications, 6);
  assert.equal(body.timeline.length, 24);
  assert.deepEqual(body.timeline[8], { key: '8', label: '8 AM', minutes: 45 });
  assert.equal(body.timeline[0].label, '12 AM');
  assert.equal(body.timeline[12].label, '12 PM');
  assert.deepEqual(Object.fromEntries(body.categories.map((c) => [c.category, c.minutes])), {
    productivity: 30,
    social: 30,
  });
  assert.deepEqual(
    body.topApps.find((a) => a.id === 'instagram'),
    { id: 'instagram', appName: 'Instagram', category: 'social', minutes: 30, opens: 4 },
  );
});

test('weekly activity averages only days with data', async () => {
  const client = await signedInClient();
  await uploadDay(client, daysBefore(TODAY, 3), [hourEntry(10, { apps: [appEntry('a', 3600)] })]);
  await uploadDay(client, TODAY, [hourEntry(10, { apps: [appEntry('a', 1800)] })]);

  const { body } = await client.get('/v1/activity?range=week');

  assert.equal(body.totalMinutes, 90);
  assert.equal(body.dailyAverageMinutes, 45);
  assert.equal(body.timeline[0].key, '2026-09-09');
  assert.deepEqual(body.timeline.at(-1), { key: '2026-09-15', label: 'Tue', minutes: 30 });
});

test('activity with no data is empty', async () => {
  const client = await signedInClient();
  const { body } = await client.get('/v1/activity?range=week');

  assert.equal(body.totalMinutes, 0);
  assert.deepEqual(body.topApps, []);
  assert.deepEqual(body.categories, []);
  assert.equal((await client.get('/v1/activity?range=year')).status, 422);
});
