const express = require('express');

const auth = require('../auth');
const { EmailTakenError } = require('../store');
const { HttpError, parse, schemas } = require('../validation');

/** Only these fields ever leave the server (never the password hash). */
const publicAccount = ({ id, email, timezone }) => ({ id, email, timezone });

module.exports = function authRoutes({ store, now, requireAccount, bearerToken }) {
  const router = express.Router();

  router.post('/auth/sign-up', async (req, res) => {
    const { email, password, timezone } = parse(schemas.signUp, req.body);
    let account;
    try {
      account = await store.createAccount({ email, passwordHash: await auth.hashPassword(password), timezone });
    } catch (err) {
      if (err instanceof EmailTakenError) {
        throw new HttpError(409, 'An account with this email already exists. Try signing in.');
      }
      throw err;
    }
    const token = await auth.startSession(store, account, now());
    res.status(201).json({ token, account: publicAccount(account) });
  });

  router.post('/auth/sign-in', async (req, res) => {
    const { email, password, timezone } = parse(schemas.signIn, req.body);
    let account = await auth.authenticate(store, email, password);
    if (!account) throw new HttpError(401, 'Incorrect email or password.');
    if (timezone && timezone !== account.timezone) {
      account = await store.updateAccount(account.id, { timezone });
    }
    const token = await auth.startSession(store, account, now());
    res.json({ token, account: publicAccount(account) });
  });

  /** Ends this device's session. Other devices stay signed in. */
  router.post('/auth/sign-out', async (req, res) => {
    // An unknown or already-ended session is fine: the app can always clear its token.
    await auth.endSession(store, bearerToken(req));
    res.status(204).end();
  });

  router.get('/me', requireAccount, (req, res) => {
    res.json(publicAccount(req.account));
  });

  router.patch('/me', requireAccount, async (req, res) => {
    const { timezone } = parse(schemas.accountUpdate, req.body);
    res.json(publicAccount(await store.updateAccount(req.account.id, { timezone })));
  });

  return router;
};
