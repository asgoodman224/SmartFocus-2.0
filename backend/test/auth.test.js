const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { PASSWORD, TODAY, appEntry, hourEntry, makeClient, signedInClient, uploadDay } = require('./helpers');

const PROTECTED = [
  ['get', '/v1/me'],
  ['patch', '/v1/me'],
  ['get', '/v1/summary/today'],
  ['get', '/v1/usage/daily'],
  ['get', '/v1/activity'],
  ['get', '/v1/insights'],
  ['get', '/v1/check-ins'],
  ['post', '/v1/check-ins'],
  ['get', '/v1/data-sources'],
  ['put', '/v1/data-sources/motion'],
  ['put', `/v1/usage/days/${TODAY}`],
];

const signIn = (client, email, password = PASSWORD, extra = {}) =>
  client.post('/v1/auth/sign-in', { email, password, ...extra }, { token: null });

describe('every data endpoint requires sign-in', () => {
  for (const [method, path] of PROTECTED) {
    test(`${method.toUpperCase()} ${path}`, async () => {
      const client = await makeClient();
      const call = (opts) => (method === 'get' ? client.get(path, opts) : client[method](path, {}, opts));
      const missing = await call();
      assert.equal(missing.status, 401);
      assert.equal(missing.headers['www-authenticate'], 'Bearer');

      const bad = await call({ token: 'not-a-real-token' });
      assert.equal(bad.status, 401);
    });
  }
});

test('sign-up returns a token and the account', async () => {
  const client = await makeClient();
  const body = await client.signUp('Sam@Example.com', 'Europe/Berlin');

  assert.ok(body.token);
  assert.equal(body.account.email, 'sam@example.com');
  assert.equal(body.account.timezone, 'Europe/Berlin');
  const me = await client.get('/v1/me');
  assert.deepEqual(me.body, body.account);
  assert.deepEqual(Object.keys(me.body).sort(), ['email', 'id', 'timezone']);
});

test('sign-up validation', async () => {
  const client = await makeClient();
  const attempt = (fields) =>
    client.post('/v1/auth/sign-up', { email: 'a@example.com', password: PASSWORD, timezone: 'UTC', ...fields });

  assert.equal((await attempt({ email: 'not-an-email' })).status, 422);
  assert.equal((await attempt({ password: 'short' })).status, 422);
  assert.equal((await attempt({ timezone: 'Mars/Olympus_Mons' })).status, 422);
  assert.equal((await attempt({})).status, 201);
});

test('a duplicate email is rejected, ignoring case', async () => {
  const client = await makeClient();
  await client.signUp('sam@example.com');

  const res = await client.post(
    '/v1/auth/sign-up',
    { email: 'SAM@example.com', password: PASSWORD, timezone: 'UTC' },
    { token: null },
  );
  assert.equal(res.status, 409);
  assert.match(res.body.detail, /already exists/);
});

test('sign-in', async () => {
  const client = await makeClient();
  await client.signUp('sam@example.com');

  const res = await signIn(client, 'SAM@example.com', PASSWORD, { timezone: 'Asia/Tokyo' });

  assert.equal(res.status, 200);
  assert.equal(res.body.account.timezone, 'Asia/Tokyo');
  assert.equal((await client.get('/v1/me', { token: res.body.token })).status, 200);
});

test('both sign-in failures share one message', async () => {
  const client = await makeClient();
  await client.signUp('sam@example.com');

  const wrongPassword = await signIn(client, 'sam@example.com', 'wrong password');
  const unknownEmail = await signIn(client, 'nobody@example.com');

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(wrongPassword.body, { detail: 'Incorrect email or password.' });
  assert.deepEqual(unknownEmail.body, wrongPassword.body);
});

test('sign-out ends only that session', async () => {
  const client = await makeClient();
  const phone = (await client.signUp('sam@example.com')).token;
  const tablet = (await signIn(client, 'sam@example.com')).body.token;

  assert.equal((await client.post('/v1/auth/sign-out', undefined, { token: phone })).status, 204);

  assert.equal((await client.get('/v1/me', { token: phone })).status, 401);
  assert.equal((await client.get('/v1/me', { token: tablet })).status, 200);
});

test('sign-out needs a token but is idempotent', async () => {
  const client = await makeClient();
  assert.equal((await client.post('/v1/auth/sign-out')).status, 401);
  // An unknown or already-ended session is fine: the app can always clear its token.
  assert.equal((await client.post('/v1/auth/sign-out', undefined, { token: 'stale' })).status, 204);
});

test('sessions expire', async () => {
  const client = await signedInClient();
  const start = client.clock.now;
  const days = (n) => new Date(start.getTime() + n * 24 * 60 * 60 * 1000);

  client.clock.now = days(89);
  assert.equal((await client.get('/v1/me')).status, 200);
  client.clock.now = days(91);
  assert.equal((await client.get('/v1/me')).status, 401);
});

test('update time zone', async () => {
  const client = await signedInClient();
  const res = await client.patch('/v1/me', { timezone: 'America/Los_Angeles' });

  assert.equal(res.status, 200);
  assert.equal(res.body.timezone, 'America/Los_Angeles');
  assert.equal((await client.patch('/v1/me', { timezone: 'Nowhere' })).status, 422);
});

test('users only see their own data', async () => {
  const client = await makeClient();
  const alex = (await client.signUp('alex@example.com')).token;
  const sam = (await client.signUp('sam@example.com')).token; // client now acts as sam

  await client.post('/v1/check-ins', { mood: 5, energy: 5, focus: 5 });
  await client.put('/v1/data-sources/appUsage', { status: 'connected' });
  await uploadDay(client, TODAY, [hourEntry(9, { pickups: 3, apps: [appEntry('a', 600)] })]);

  client.useToken(alex);
  assert.deepEqual((await client.get('/v1/check-ins')).body, []);
  assert.equal((await client.get('/v1/summary/today')).body.pickups, 0);
  assert.equal((await client.get('/v1/activity')).body.totalMinutes, 0);
  const statuses = new Set((await client.get('/v1/data-sources')).body.map((s) => s.status));
  assert.deepEqual(statuses, new Set(['notConnected']));

  client.useToken(sam);
  assert.equal((await client.get('/v1/check-ins')).body.length, 1);
  assert.equal((await client.get('/v1/summary/today')).body.pickups, 3);
});

test('unknown routes and bad JSON get readable errors', async () => {
  const client = await signedInClient();
  assert.deepEqual((await client.get('/v1/nope')).body, { detail: 'Not found.' });

  const res = await client.post('/v1/check-ins').set('Content-Type', 'application/json').send('{bad json');
  assert.equal(res.status, 422);
  assert.equal(res.body.detail, 'Request body must be valid JSON.');
});
