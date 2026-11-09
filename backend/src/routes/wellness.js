const express = require('express');

const time = require('../time');
const { HttpError, parse, schemas } = require('../validation');

module.exports = function wellnessRoutes({ store, now, requireAccount }) {
  const router = express.Router();

  /**
   * The wellness score the phone showed for one local day, replacing any
   * earlier upload for that day. The phone re-sends today on every sync, so
   * the last upload of the day is what the participant saw that evening.
   */
  router.put('/days/:day', requireAccount, async (req, res) => {
    const date = parse(schemas.isoDate, req.params.day);
    const upload = parse(schemas.wellnessDayUpload, req.body);
    if (date > time.localToday(req.account.timezone, now())) {
      throw new HttpError(422, 'Date is in the future.');
    }
    await store.replaceWellnessDay(req.account.id, { date, ...upload });
    res.status(204).end();
  });

  return router;
};
