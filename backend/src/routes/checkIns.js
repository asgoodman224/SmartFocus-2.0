const express = require('express');

const { HttpError, parse, schemas } = require('../validation');

// How far a phone's clock may run ahead, and how late an offline check-in may arrive.
const MAX_FUTURE_MS = 5 * 60 * 1000;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

module.exports = function checkInRoutes({ store, now, requireAccount }) {
  const router = express.Router();

  /** Most recent check-ins, newest first. */
  router.get('/', requireAccount, async (req, res) => {
    const { limit } = parse(schemas.checkInList, req.query);
    res.json(await store.listCheckIns(req.account.id, limit));
  });

  /**
   * Save a check-in. `createdAt` is when it happened on the phone, so one
   * made offline keeps its time when it's uploaded later.
   */
  router.post('/', requireAccount, async (req, res) => {
    const { createdAt = now(), ...fields } = parse(schemas.checkInCreate, req.body);
    if (createdAt - now() > MAX_FUTURE_MS) {
      throw new HttpError(422, 'Check-in time is in the future.');
    }
    if (now() - createdAt > MAX_AGE_MS) {
      throw new HttpError(422, 'Check-in time is more than 30 days ago.');
    }
    res.status(201).json(await store.createCheckIn(req.account.id, { ...fields, createdAt }));
  });

  return router;
};
