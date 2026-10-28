const assert = require('node:assert/strict');
const { test } = require('node:test');

const { signedInClient } = require('./helpers');

const create = (client, fields = {}) => client.post('/v1/check-ins', { mood: 4, energy: 3, focus: 5, ...fields });

test('create returns the check-in', async () => {
  const client = await signedInClient();
  const res = await create(client, { note: '  Good day  ' });

  assert.equal(res.status, 201);
  assert.equal(res.body.mood, 4);
  assert.equal(res.body.energy, 3);
  assert.equal(res.body.focus, 5);
  assert.equal(res.body.note, 'Good day');
  assert.equal(res.body.createdAt, '2026-09-15T16:00:00.000Z');
  assert.ok(res.body.id);
});

test('a blank or missing note is left out', async () => {
  const client = await signedInClient();
  assert.ok(!('note' in (await create(client, { note: '   ' })).body));
  assert.ok(!('note' in (await create(client)).body));
  assert.ok(!('note' in (await create(client, { note: null })).body));
});

test('list is newest first and limited', async () => {
  const client = await signedInClient();
  for (const [mood, iso] of [[1, '2026-09-15T10:00:00Z'], [2, '2026-09-15T12:00:00Z'], [3, '2026-09-15T11:00:00Z']]) {
    client.clock.now = new Date(iso);
    await create(client, { mood });
  }

  const res = await client.get('/v1/check-ins?limit=2');

  assert.deepEqual(res.body.map((c) => c.mood), [2, 3]);
});

test('rejects out-of-range ratings and long notes', async () => {
  const client = await signedInClient();
  assert.equal((await create(client, { mood: 0 })).status, 422);
  assert.equal((await create(client, { focus: 6 })).status, 422);
  assert.equal((await create(client, { mood: 2.5 })).status, 422);
  assert.equal((await create(client, { note: 'x'.repeat(281) })).status, 422);
  assert.equal((await client.post('/v1/check-ins', { mood: 3 })).status, 422);
  assert.equal((await client.get('/v1/check-ins?limit=0')).status, 422);
});

test('kind and sleep quality are saved and returned', async () => {
  const client = await signedInClient();
  const res = await create(client, { kind: 'morning', sleepQuality: 2 });

  assert.equal(res.status, 201);
  assert.equal(res.body.kind, 'morning');
  assert.equal(res.body.sleepQuality, 2);
  assert.deepEqual((await client.get('/v1/check-ins')).body[0], res.body);
});

test('kind and sleep quality are left out when not given', async () => {
  const client = await signedInClient();
  for (const body of [(await create(client)).body, (await create(client, { kind: null, sleepQuality: null })).body]) {
    assert.ok(!('kind' in body));
    assert.ok(!('sleepQuality' in body));
  }
});

test('createdAt is when the check-in happened on the phone', async () => {
  const client = await signedInClient();
  const res = await create(client, { createdAt: '2026-09-14T07:45:00-04:00' });

  assert.equal(res.status, 201);
  assert.equal(res.body.createdAt, '2026-09-14T11:45:00.000Z');
});

test('list is ordered by createdAt, not upload order', async () => {
  const client = await signedInClient();
  await create(client, { mood: 1, createdAt: '2026-09-15T09:00:00Z' });
  await create(client, { mood: 2, createdAt: '2026-09-13T09:00:00Z' }); // uploaded late, after being offline
  await create(client, { mood: 3, createdAt: '2026-09-14T09:00:00Z' });

  const { body } = await client.get('/v1/check-ins');

  assert.deepEqual(body.map((c) => c.mood), [1, 3, 2]);
});

test('a late upload counts towards the day it happened', async () => {
  const client = await signedInClient();
  await create(client, { createdAt: '2026-09-14T22:00:00-04:00' });
  assert.equal((await client.get('/v1/summary/today')).body.hasCheckedInToday, false);

  await create(client, { createdAt: '2026-09-15T08:00:00-04:00' });
  assert.equal((await client.get('/v1/summary/today')).body.hasCheckedInToday, true);
  assert.equal((await client.get('/v1/insights?range=week')).body.checkInCount, 2);
});

test('createdAt must be recent and not in the future', async () => {
  const client = await signedInClient();
  // Now is 2026-09-15T16:00:00Z.
  const future = await create(client, { createdAt: '2026-09-15T16:05:01Z' });
  assert.equal(future.status, 422);
  assert.equal(future.body.detail, 'Check-in time is in the future.');
  const old = await create(client, { createdAt: '2026-08-16T15:59:59Z' });
  assert.equal(old.status, 422);
  assert.equal(old.body.detail, 'Check-in time is more than 30 days ago.');

  assert.equal((await create(client, { createdAt: '2026-09-15T16:05:00Z' })).status, 201); // phone clock a bit fast
  assert.equal((await create(client, { createdAt: '2026-08-16T16:00:00Z' })).status, 201);
});

test('rejects bad createdAt, kind and sleep quality', async () => {
  const client = await signedInClient();
  assert.equal((await create(client, { createdAt: '2026-09-15T08:00:00' })).status, 422); // no offset
  assert.equal((await create(client, { createdAt: '2026-09-15' })).status, 422);
  assert.equal((await create(client, { createdAt: 1789488000000 })).status, 422);
  assert.equal((await create(client, { kind: 'night' })).status, 422);
  assert.equal((await create(client, { sleepQuality: 0 })).status, 422);
  assert.equal((await create(client, { sleepQuality: 6 })).status, 422);
  assert.equal((await create(client, { sleepQuality: 3.5 })).status, 422);
});
