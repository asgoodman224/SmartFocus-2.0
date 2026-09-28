const express = require('express');

const { parse, schemas } = require('../validation');

module.exports = function checkInRoutes({ store, now, requireAccount }) {
  const router = express.Router();

  /** Most recent check-ins, newest first. */
  router.get('/', requireAccount, async (req, res) => {
    const { limit } = parse(schemas.checkInList, req.query);
    res.json(await store.listCheckIns(req.account.id, limit));
  });

  router.post('/', requireAccount, async (req, res) => {
    const fields = parse(schemas.checkInCreate, req.body);
    res.status(201).json(await store.createCheckIn(req.account.id, { ...fields, createdAt: now() }));
  });

  return router;
};
