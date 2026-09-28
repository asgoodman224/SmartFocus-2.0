const assert = require('node:assert/strict');
const { test } = require('node:test');

const { focusScore } = require('../src/focus');
const { TODAY, daysBefore, hourEntry, signedInClient, uploadDay } = require('./helpers');

/** Uploads a day whose focus score depends only on `pickups`; returns that score. */
async function uploadScoreDay(client, daysAgo, pickups) {
  await uploadDay(client, daysBefore(TODAY, daysAgo), [hourEntry(10, { pickups })], { longestFocusMinutes: 60 });
  return focusScore({ pickups, notifications: 0, longestFocusMinutes: 60 });
}

const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;

test('week report with no data', async () => {
  const client = await signedInClient();
  const { body } = await client.get('/v1/insights?range=week');

  assert.deepEqual(body, {
    range: 'week',
    averageFocusScore: 0,
    focusScoreChange: 0,
    averageMood: null,
    checkInCount: 0,
    focusTrend: [],
    insights: [],
  });
});

test('week trend skips missing days and compares with the previous week', async () => {
  const client = await signedInClient();
  const thisWeek = [await uploadScoreDay(client, 0, 10), await uploadScoreDay(client, 2, 50)];
  const lastWeek = await uploadScoreDay(client, 9, 100);

  const { body } = await client.get('/v1/insights?range=week');

  assert.deepEqual(body.focusTrend.map((p) => p.key), ['2026-09-13', '2026-09-15']);
  assert.equal(body.focusTrend.at(-1).label, 'Tue');
  const average = Math.round(mean(thisWeek));
  assert.equal(body.averageFocusScore, average);
  assert.equal(body.focusScoreChange, average - lastWeek);
});

test('mood average and check-in count', async () => {
  const client = await signedInClient();
  for (const mood of [2, 5]) await client.post('/v1/check-ins', { mood, energy: 3, focus: 3 });

  const { body } = await client.get('/v1/insights?range=week');

  assert.equal(body.averageMood, 3.5);
  assert.equal(body.checkInCount, 2);
});

test('month trend is weekly', async () => {
  const client = await signedInClient();
  const oldestWeek = await uploadScoreDay(client, 27, 30);
  const newestWeek = [await uploadScoreDay(client, 0, 10), await uploadScoreDay(client, 1, 20)];

  const { body } = await client.get('/v1/insights?range=month');

  assert.deepEqual(body.focusTrend, [
    { key: '2026-08-19', label: 'Aug 19', value: oldestWeek },
    { key: '2026-09-09', label: 'Sep 9', value: Math.round(mean(newestWeek)) },
  ]);
});
