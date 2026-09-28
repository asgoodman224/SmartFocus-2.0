const express = require('express');

const reports = require('../reports');
const time = require('../time');
const { HttpError, parse, schemas } = require('../validation');

module.exports = function usageRoutes({ store, now, requireAccount }) {
  const router = express.Router();

  router.get('/summary/today', requireAccount, async (req, res) => {
    res.json(await reports.dailySummary(store, req.account, now()));
  });

  /** Screen time per day for the last `days` days (including today), oldest first. */
  router.get('/usage/daily', requireAccount, async (req, res) => {
    const { days } = parse(schemas.dailyUsage, req.query);
    res.json(await reports.dailyUsage(store, req.account, now(), days));
  });

  router.get('/activity', requireAccount, async (req, res) => {
    const { range = 'day' } = parse(schemas.timeRange, req.query);
    res.json(await reports.activityReport(store, req.account, now(), range));
  });

  /**
   * Upload one local day of usage from the phone, replacing any earlier
   * upload. The phone can re-send today as often as it likes; each upload
   * overwrites the last, so retries are safe.
   */
  router.put('/usage/days/:day', requireAccount, async (req, res) => {
    const date = parse(schemas.isoDate, req.params.day);
    const upload = parse(schemas.usageDayUpload, req.body);
    if (date > time.localToday(req.account.timezone, now())) {
      throw new HttpError(422, 'Date is in the future.');
    }
    await store.replaceUsageDay(req.account.id, { date, ...upload });
    res.status(204).end();
  });

  return router;
};
