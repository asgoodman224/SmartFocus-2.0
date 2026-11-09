const assert = require('node:assert/strict');
const { test } = require('node:test');

const { TODAY, PASSWORD, daysBefore, makeClient, signedInClient } = require('./helpers');

const DEVICE = {
  installId: '6f1c2a9e-4b7d-4e0a-9a51-0c3f8d2b7e11',
  platform: 'android',
  manufacturer: 'Google',
  model: 'Pixel 8',
  osVersion: 'Android 15 (API 35)',
  appVersion: '1.2 (3)',
};

test('health uploads keep bedtime and wake time', async () => {
  const client = await signedInClient();
  const res = await client.put(`/v1/health/days/${TODAY}`, {
    sleepMinutes: 420,
    sleepStart: '2026-09-14T23:10:00-04:00',
    sleepEnd: '2026-09-15T06:40:00-04:00',
  });
  assert.equal(res.status, 204);

  const [day] = await client.store.getHealthDays(client.account.id, TODAY, TODAY);
  assert.equal(new Date(day.sleepStart).toISOString(), '2026-09-15T03:10:00.000Z');
  assert.equal(new Date(day.sleepEnd).toISOString(), '2026-09-15T10:40:00.000Z');

  // The app's daily view is unchanged.
  const { body } = await client.get('/v1/health/daily?days=1');
  assert.deepEqual(Object.keys(body[0]), ['date', 'sleepMinutes', 'steps', 'exerciseMinutes', 'distanceMeters']);
});

test('health uploads without sleep times store them as null', async () => {
  const client = await signedInClient();
  await client.put(`/v1/health/days/${TODAY}`, { steps: 100 });
  const [day] = await client.store.getHealthDays(client.account.id, TODAY, TODAY);
  assert.equal(day.sleepStart, null);
  assert.equal(day.sleepEnd, null);
});

test('health uploads reject sleep times without an offset', async () => {
  const client = await signedInClient();
  const res = await client.put(`/v1/health/days/${TODAY}`, { sleepStart: '2026-09-14T23:10:00' });
  assert.equal(res.status, 422);
  assert.match(res.body.detail, /^sleepStart: /);
});

test('wellness uploads replace the day', async () => {
  const client = await signedInClient();
  assert.equal((await client.put(`/v1/wellness/days/${TODAY}`, { score: 70, body: 60, mind: 80, digital: 75 })).status, 204);
  assert.equal((await client.put(`/v1/wellness/days/${TODAY}`, { score: null, body: 65 })).status, 204);

  const days = await client.store.getWellnessDays(client.account.id, daysBefore(TODAY, 1), TODAY);
  assert.deepEqual(days, [{ date: TODAY, score: null, body: 65, mind: null, digital: null }]);
});

test('wellness uploads check the values and the date', async () => {
  const client = await signedInClient();
  assert.equal((await client.put(`/v1/wellness/days/${TODAY}`, { score: 101 })).status, 422);
  assert.equal((await client.put('/v1/wellness/days/2026-09-16', { score: 50 })).status, 422);
  assert.equal((await client.put('/v1/wellness/days/not-a-date', { score: 50 })).status, 422);
  const anon = await makeClient();
  assert.equal((await anon.put(`/v1/wellness/days/${TODAY}`, { score: 50 })).status, 401);
});

test('the phone reports its device, and a later report updates it', async () => {
  const client = await signedInClient();
  assert.equal((await client.put('/v1/me/device', DEVICE)).status, 204);
  assert.equal((await client.put('/v1/me/device', { ...DEVICE, appVersion: '1.3 (4)', model: '' })).status, 204);

  const devices = await client.store.listDevices(client.account.id);
  assert.equal(devices.length, 1);
  assert.equal(devices[0].appVersion, '1.3 (4)');
  assert.equal(devices[0].model, null);
  assert.ok(devices[0].lastSeenAt >= devices[0].firstSeenAt);
});

test('device reports need an install id and a known platform', async () => {
  const client = await signedInClient();
  assert.equal((await client.put('/v1/me/device', { ...DEVICE, installId: undefined })).status, 422);
  assert.equal((await client.put('/v1/me/device', { ...DEVICE, platform: 'windows' })).status, 422);
});

test('sign-in is refused after 10 tries for one email from one address', async () => {
  const client = await makeClient();
  await client.signUp('kim@example.com');
  for (let i = 0; i < 9; i++) {
    const res = await client.post('/v1/auth/sign-in', { email: 'kim@example.com', password: 'wrong password' });
    assert.equal(res.status, 401);
  }
  const blocked = await client.post('/v1/auth/sign-in', { email: 'kim@example.com', password: PASSWORD });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers['retry-after']) > 0);

  // Another participant on the same network can still sign in.
  assert.equal((await client.post('/v1/auth/sign-up', { email: 'lee@example.com', password: PASSWORD, timezone: 'UTC' })).status, 201);

  client.clock.now = new Date(client.clock.now.getTime() + 15 * 60 * 1000);
  assert.equal((await client.post('/v1/auth/sign-in', { email: 'kim@example.com', password: PASSWORD })).status, 200);
});
