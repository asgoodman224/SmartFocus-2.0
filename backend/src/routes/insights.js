const express = require('express');

const reports = require('../reports');
const { parse, schemas } = require('../validation');

module.exports = function insightRoutes({ store, now, requireAccount }) {
  const router = express.Router();

  router.get('/', requireAccount, async (req, res) => {
    const { range = 'week' } = parse(schemas.timeRange, req.query);
    res.json(await reports.insightsReport(store, req.account, now(), range));
  });

  return router;
};
