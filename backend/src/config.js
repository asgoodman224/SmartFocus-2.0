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

  // Database. Either DATABASE_URL (postgres://… or mysql://…), or MySQL by
  // parts with DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (as in the
  // database-api branch). Neither: data is kept in memory and lost when the
  // server stops.
  databaseUrl: process.env.DATABASE_URL || null,
  mysql: process.env.DB_USER
    ? {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME || 'smartfocus',
      }
    : null,
  // Most hosted databases need SSL. DATABASE_SSL=true turns it on without
  // checking the certificate (fine for this project; not for real patient data).
  databaseSsl: flag(process.env.DATABASE_SSL),
};

module.exports = config;
