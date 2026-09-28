/**
 * Test setup: a fresh in-memory store per test and a pinned clock.
 * To run the suite against another store (e.g. MySQL), change `makeStore`.
 */
process.env.SCRYPT_LOG_N ??= '10'; // fast password hashing in tests

const request = require('supertest');

const { createApp } = require('../src/app');
const { createMemoryStore } = require('../src/store/memoryStore');

// Tuesday, September 15 2026, 12:00 noon in New York (EDT, UTC-4).
const NOW = new Date('2026-09-15T16:00:00Z');
const TODAY = '2026-09-15';
const TIMEZONE = 'America/New_York';
const PASSWORD = 'correct horse battery';

async function makeStore() {
  return createMemoryStore();
}

/**
 * An API client. `clock.now` can be moved to test expiry.
 * Requests carry `token` when one is set with `signIn`/`signUp` or `useToken`.
 */
async function makeClient() {
  const store = await makeStore();
  const clock = { now: NOW };
  const app = createApp({ store, now: () => clock.now });
  let token = null;

  const send = (method, path, body, headers = {}) => {
    let req = request(app)[method](path);
    const auth = headers.token === undefined ? token : headers.token;
    if (auth) req = req.set('Authorization', `Bearer ${auth}`);
    return body === undefined ? req : req.send(body);
  };

  const client = {
    store,
    clock,
    get: (path, opts) => send('get', path, undefined, opts),
    post: (path, body, opts) => send('post', path, body, opts),
    put: (path, body, opts) => send('put', path, body, opts),
    patch: (path, body, opts) => send('patch', path, body, opts),
    useToken(value) {
      token = value;
    },
    /** Creates an account and signs this client in as it. Returns the response body. */
    async signUp(email = 'sam@example.com', timezone = TIMEZONE) {
      const res = await send('post', '/v1/auth/sign-up', { email, password: PASSWORD, timezone }, { token: null });
      if (res.status !== 201) throw new Error(`sign-up failed: ${res.status} ${res.text}`);
      token = res.body.token;
      return res.body;
    },
  };
  return client;
}

/** A client already signed in as sam@example.com. */
async function signedInClient() {
  const client = await makeClient();
  client.account = (await client.signUp()).account;
  return client;
}

const appEntry = (appId, seconds, { category = 'social', opens = 1 } = {}) => ({
  appId,
  appName: appId[0].toUpperCase() + appId.slice(1),
  category,
  seconds,
  opens,
});

const hourEntry = (hour, { pickups = 0, notifications = 0, apps = [] } = {}) => ({ hour, pickups, notifications, apps });

async function uploadDay(client, date, hours, { longestFocusMinutes = 60 } = {}) {
  const res = await client.put(`/v1/usage/days/${date}`, { longestFocusMinutes, hours });
  if (res.status !== 204) throw new Error(`upload failed: ${res.status} ${res.text}`);
}

const daysBefore = (date, days) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

module.exports = {
  NOW,
  TODAY,
  TIMEZONE,
  PASSWORD,
  makeClient,
  signedInClient,
  appEntry,
  hourEntry,
  uploadDay,
  daysBefore,
};
