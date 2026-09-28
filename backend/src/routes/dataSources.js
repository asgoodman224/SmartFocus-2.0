const express = require('express');

const { parse, schemas } = require('../validation');

// Display text lives here so every client shows the same wording.
const DATA_SOURCES = {
  appUsage: {
    label: 'App usage',
    description: 'Time spent in apps and how often you pick up your phone.',
  },
  notifications: {
    label: 'Notification activity',
    description: 'How many notifications you receive. Never their content.',
  },
  motion: {
    label: 'Physical activity',
    description: "Steps and movement from your phone's motion sensors.",
  },
};

const describe = (id, status) => ({ id, ...DATA_SOURCES[id], status });

module.exports = function dataSourceRoutes({ store, requireAccount }) {
  const router = express.Router();

  /** Which phone signals the user has granted. Unset sources are "notConnected". */
  router.get('/', requireAccount, async (req, res) => {
    const statuses = await store.getDataSourceStatuses(req.account.id);
    res.json(Object.keys(DATA_SOURCES).map((id) => describe(id, statuses[id] ?? 'notConnected')));
  });

  /** Called by the phone when a permission is granted, revoked or unsupported. */
  router.put('/:sourceId', requireAccount, async (req, res) => {
    const sourceId = parse(schemas.dataSourceId, req.params.sourceId);
    const { status } = parse(schemas.dataSourceUpdate, req.body);
    await store.setDataSourceStatus(req.account.id, sourceId, status);
    res.json(describe(sourceId, status));
  });

  return router;
};
