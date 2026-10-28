const express = require('express');

const reports = require('../reports');
const time = require('../time');
const { HttpError, parse, schemas } = require('../validation');

module.exports = function healthRoutes({ store, now, requireAccount }) {
  const router = express.Router();

  /** Health data per day for the last `days` days (including today), oldest first. */
  router.get('/daily', requireAccount, async (req, res) => {
    const { days } = parse(schemas.dailyHealth, req.query);
    res.json(await reports.dailyHealth(store, req.account, now(), days));
  });

  /**
   * Upload one local day of health data from the phone, replacing any earlier
   * upload (missing or null values included), so retries are safe.
   */
  router.put('/days/:day', requireAccount, async (req, res) => {
    const date = parse(schemas.isoDate, req.params.day);
    const upload = parse(schemas.healthDayUpload, req.body);
    if (date > time.localToday(req.account.timezone, now())) {
      throw new HttpError(422, 'Date is in the future.');
    }
    await store.replaceHealthDay(req.account.id, { date, ...upload });
    res.status(204).end();
  });

  return router;
};
