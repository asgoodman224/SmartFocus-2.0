/**
 * Settings, read from environment variables or `backend/.env`.
 */
require('dotenv').config({ quiet: true });

function flag(value) {
  return value === 'true' || value === '1';
}

const config = {
  port: Number(process.env.PORT) || 3000,

  // Browser origins allowed to call the API. Native apps don't need CORS;
  // this is for `expo start --web` during development.
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:8081')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // How long a sign-in lasts before the app must sign in again.
  sessionDays: Number(process.env.SESSION_DAYS) || 90,

  // Local development only: adds demo@smartfocus.dev / smartfocus-demo with
  // four weeks of sample data (in the in-memory store).
  demoAccount: flag(process.env.DEMO_ACCOUNT),
};

module.exports = config;
