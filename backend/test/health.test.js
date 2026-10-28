const assert = require('node:assert/strict');
const { test } = require('node:test');

const { TODAY, daysBefore, makeClient, signedInClient } = require('./helpers');

const DAY = { sleepMinutes: 450, steps: 8200, exerciseMinutes: 35, distanceMeters: 6100 };
const EMPTY = { sleepMinutes: null, steps: null, exerciseMinutes: null, distanceMeters: null };

async function uploadHealth(client, date, fields) {
  const res = await client.put(`/v1/health/days/${date}`, fields);
  if (res.status !== 204) throw new Error(`upload failed: ${res.status} ${res.text}`);
}

test('health endpoints need a sign-in', async () => {
  const client = await makeClient();
  assert.equal((await client.put(`/v1/health/days/${TODAY}`, DAY)).status, 401);
  assert.equal((await client.get('/v1/health/daily')).status, 401);
});

test('daily health lists the last 7 days by default, oldest first', async () => {
  const client = await signedInClient();
  await uploadHealth(client, TODAY, DAY);

  const { body } = await client.get('/v1/health/daily');

  assert.equal(body.length, 7);
  assert.deepEqual(body[0], { date: '2026-09-09', ...EMPTY });
  assert.deepEqual(body.at(-1), { date: '2026-09-15', ...DAY });
});

test('daily health leaves missing days and values null', async () => {
  const client = await signedInClient();
  await uploadHealth(client, daysBefore(TODAY, 2), { steps: 0, sleepMinutes: null });
  await uploadHealth(client, TODAY, { exerciseMinutes: 20 });

  const { body } = await client.get('/v1/health/daily?days=3');

  assert.deepEqual(body, [
    { date: '2026-09-13', ...EMPTY, steps: 0 },
    { date: '2026-09-14', ...EMPTY },
    { date: '2026-09-15', ...EMPTY, exerciseMinutes: 20 },
  ]);
});

test('an upload replaces the previous upload for that day', async () => {
  const client = await signedInClient();
  await uploadHealth(client, TODAY, DAY);
  await uploadHealth(client, TODAY, { steps: 9000 });

  const { body } = await client.get('/v1/health/daily?days=1');

  assert.deepEqual(body, [{ date: TODAY, ...EMPTY, steps: 9000 }]);
});

test('health data belongs to one account', async () => {
  const client = await signedInClient();
  await uploadHealth(client, TODAY, DAY);
  await client.signUp('alex@example.com');

  const { body } = await client.get('/v1/health/daily?days=1');

  assert.deepEqual(body, [{ date: TODAY, ...EMPTY }]);
});

test('health upload validation', async () => {
  const client = await signedInClient();
  const put = (date, fields) => client.put(`/v1/health/days/${date}`, fields);

  const tomorrow = await put(daysBefore(TODAY, -1), DAY);
  assert.equal(tomorrow.status, 422);
  assert.equal(tomorrow.body.detail, 'Date is in the future.');
  assert.equal((await put('2026-9-15', DAY)).status, 422);
  assert.equal((await put(TODAY, { sleepMinutes: 1441 })).status, 422);
  assert.equal((await put(TODAY, { exerciseMinutes: -1 })).status, 422);
  assert.equal((await put(TODAY, { steps: 12.5 })).status, 422);
  assert.equal((await put(TODAY, { distanceMeters: '6100' })).status, 422);
  assert.equal((await client.get('/v1/health/daily?days=0')).status, 422);
  assert.equal((await client.get('/v1/health/daily?days=91')).status, 422);
  assert.equal((await put(TODAY, {})).status, 204);
  assert.equal((await put(TODAY, { sleepMinutes: 1440, exerciseMinutes: 0 })).status, 204);
});
