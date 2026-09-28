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
