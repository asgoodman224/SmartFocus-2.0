const assert = require('node:assert/strict');
const { test } = require('node:test');

const { focusScore } = require('../src/focus');
const { signedInClient } = require('./helpers');

test('sources default to not connected', async () => {
  const client = await signedInClient();
  const { body } = await client.get('/v1/data-sources');

  assert.deepEqual(body.map((s) => s.id), ['appUsage', 'notifications', 'motion']);
  assert.deepEqual(new Set(body.map((s) => s.status)), new Set(['notConnected']));
  assert.equal(body[1].label, 'Notification activity');
});

test('update status', async () => {
  const client = await signedInClient();
  const res = await client.put('/v1/data-sources/appUsage', { status: 'connected' });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'connected');

  await client.put('/v1/data-sources/appUsage', { status: 'unavailable' });
  const statuses = Object.fromEntries((await client.get('/v1/data-sources')).body.map((s) => [s.id, s.status]));
  assert.deepEqual(statuses, { appUsage: 'unavailable', notifications: 'notConnected', motion: 'notConnected' });
});

test('update rejects unknown source or status', async () => {
  const client = await signedInClient();
  assert.equal((await client.put('/v1/data-sources/camera', { status: 'connected' })).status, 422);
  assert.equal((await client.put('/v1/data-sources/motion', { status: 'on' })).status, 422);
});

test('focus score bounds', () => {
  assert.equal(focusScore({ pickups: 0, notifications: 0, longestFocusMinutes: 90 }), 100);
  assert.equal(focusScore({ pickups: 500, notifications: 900, longestFocusMinutes: 0 }), 0);
  // Roughly the app's mock "today" (61 pickups, 118 notifications, 84 min) lands near its 72.
  const mock = focusScore({ pickups: 61, notifications: 118, longestFocusMinutes: 84 });
  assert.ok(mock >= 65 && mock <= 78, `got ${mock}`);
});
