const express = require('express');

const config = require('./config');
const { HttpError } = require('./validation');
const auth = require('./auth');
const authRoutes = require('./routes/auth');
const checkInRoutes = require('./routes/checkIns');
const dataSourceRoutes = require('./routes/dataSources');
const insightRoutes = require('./routes/insights');
const usageRoutes = require('./routes/usage');

/**
 * Builds the Express app.
 *
 * @param {object} deps
 * @param {object} deps.store  Storage (see src/store/index.js)
 * @param {() => Date} [deps.now]  The current time; tests pin it
 */
function createApp({ store, now = () => new Date() }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors(config.corsOrigins));
  app.use(express.json({ limit: '1mb' }));

  const requireAccount = async (req, res, next) => {
    const account = await auth.accountForToken(store, bearerToken(req), now());
    if (!account) throw unauthorized();
    req.account = account;
    next();
  };
  const deps = { store, now, requireAccount, bearerToken };

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/v1', authRoutes(deps));
  app.use('/v1', usageRoutes(deps));
  app.use('/v1/insights', insightRoutes(deps));
  app.use('/v1/check-ins', checkInRoutes(deps));
  app.use('/v1/data-sources', dataSourceRoutes(deps));

  app.use((req, res) => res.status(404).json({ detail: 'Not found.' }));

  // Errors are returned as { detail: "..." }, which the app shows to users.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).set(err.headers).json({ detail: err.message });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(422).json({ detail: 'Request body must be valid JSON.' });
    }
    console.error(err);
    res.status(500).json({ detail: 'Something went wrong. Please try again.' });
  });

  return app;
}

/** The token from `Authorization: Bearer <token>`, or a 401. */
function bearerToken(req) {
  const match = /^Bearer (\S+)$/i.exec(req.get('authorization') ?? '');
  if (!match) throw unauthorized();
  return match[1];
}

function unauthorized() {
  return new HttpError(401, 'Please sign in again.', { 'WWW-Authenticate': 'Bearer' });
}

/** Lets the listed browser origins call the API (for `expo start --web`). */
function cors(origins) {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (origin && origins.includes(origin)) {
      res.set({ 'Access-Control-Allow-Origin': origin, Vary: 'Origin' });
      if (req.method === 'OPTIONS') {
        res.set({
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE',
          'Access-Control-Allow-Headers': req.get('access-control-request-headers') ?? '*',
          'Access-Control-Max-Age': '600',
        });
        return res.status(204).end();
      }
    }
    next();
  };
}

module.exports = { createApp };
