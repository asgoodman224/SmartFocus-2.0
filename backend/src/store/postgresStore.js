/**
 * PostgreSQL implementation of the store (see ./index.js for the contract).
 * Tables are in ./schema.sql and are created on first use.
 */
const fs = require('node:fs');
const path = require('node:path');
const { Pool, types } = require('pg');

const { EmailTakenError } = require('./index');
const { newId, toAccount, toSession, toCheckIn, toHealthDay, toWellnessDay, toDevice, usageRows, toUsageDays } = require('./rows');

// Return DATE columns as "YYYY-MM-DD" strings, not JS Dates at local midnight.
types.setTypeParser(types.builtins.DATE, (value) => value);

const SCHEMA_SQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const UNIQUE_VIOLATION = '23505';

/**
 * @param {{ connectionString?: string, schema?: string, ssl?: object | boolean }} options
 *   `schema` puts the tables in that Postgres schema (created if missing), e.g. for tests.
 */
function createPostgresStore({ connectionString, schema, ssl } = {}) {
  const pool = new Pool({
    connectionString,
    ssl,
    options: schema ? `-c search_path=${schema}` : undefined,
    allowExitOnIdle: true,
  });
  let ready = null;

  /** Creates the tables once, before the first query. */
  function migrate() {
    ready ??= (async () => {
      if (schema) await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
      await pool.query(SCHEMA_SQL);
    })().catch((err) => {
      ready = null;
      throw err;
    });
    return ready;
  }

  async function query(text, params) {
    await migrate();
    return pool.query(text, params);
  }

  async function transaction(work) {
    await migrate();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return {
    migrate,
    close: () => pool.end(),

    async getAccount(accountId) {
      const { rows } = await query('SELECT * FROM accounts WHERE id = $1', [accountId]);
      return toAccount(rows[0]);
    },

    async getAccountByEmail(email) {
      const { rows } = await query('SELECT * FROM accounts WHERE email = $1', [email]);
      return toAccount(rows[0]);
    },

    async createAccount({ email, passwordHash, timezone, id = newId() }) {
      try {
        const { rows } = await query(
          'INSERT INTO accounts (id, email, password_hash, timezone) VALUES ($1, $2, $3, $4) RETURNING *',
          [id, email, passwordHash, timezone],
        );
        return toAccount(rows[0]);
      } catch (err) {
        if (err.code === UNIQUE_VIOLATION) throw new EmailTakenError(email);
        throw err;
      }
    },

    async updateAccount(accountId, changes) {
      const { rows } = await query(
        `UPDATE accounts
            SET password_hash = COALESCE($2, password_hash), timezone = COALESCE($3, timezone)
          WHERE id = $1 RETURNING *`,
        [accountId, changes.passwordHash ?? null, changes.timezone ?? null],
      );
      if (!rows[0]) throw new Error(`No account ${accountId}`);
      return toAccount(rows[0]);
    },

    async createSession({ tokenHash, accountId, createdAt, expiresAt }) {
      await query(
        'INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES ($1, $2, $3, $4)',
        [tokenHash, accountId, createdAt, expiresAt],
      );
    },

    async getSession(tokenHash) {
      const { rows } = await query('SELECT * FROM sessions WHERE token_hash = $1', [tokenHash]);
      return toSession(rows[0]);
    },

    async deleteSession(tokenHash) {
      await query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
    },

    async createCheckIn(accountId, { createdAt, localDay, mood, energy, focus, note, kind, sleepQuality }) {
      const { rows } = await query(
        `INSERT INTO check_ins (id, account_id, created_at, local_day, mood, energy, focus, note, kind, sleep_quality)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [newId(), accountId, createdAt, localDay ?? null, mood, energy, focus, note || null, kind ?? null, sleepQuality ?? null],
      );
      return toCheckIn(rows[0]);
    },

    async listCheckIns(accountId, limit) {
      const { rows } = await query(
        'SELECT * FROM check_ins WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2',
        [accountId, limit],
      );
      return rows.map(toCheckIn);
    },

    async listCheckInsBetween(accountId, start, end) {
      const { rows } = await query(
        'SELECT * FROM check_ins WHERE account_id = $1 AND created_at >= $2 AND created_at < $3 ORDER BY created_at',
        [accountId, start, end],
      );
      return rows.map(toCheckIn);
    },

    async getDataSourceStatuses(accountId) {
      const { rows } = await query('SELECT source_id, status FROM data_sources WHERE account_id = $1', [accountId]);
      return Object.fromEntries(rows.map((row) => [row.source_id, row.status]));
    },

    async setDataSourceStatus(accountId, sourceId, status) {
      await query(
        `INSERT INTO data_sources (account_id, source_id, status) VALUES ($1, $2, $3)
         ON CONFLICT (account_id, source_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()`,
        [accountId, sourceId, status],
      );
    },

    async replaceUsageDay(accountId, day) {
      const { hours, apps } = usageRows(day);
      await transaction(async (client) => {
        // Deleting the day cascades to its hours and app rows.
        await client.query('DELETE FROM usage_days WHERE account_id = $1 AND day = $2', [accountId, day.date]);
        await client.query('INSERT INTO usage_days (account_id, day, longest_focus_minutes) VALUES ($1, $2, $3)', [
          accountId,
          day.date,
          day.longestFocusMinutes,
        ]);
        await client.query(
          `INSERT INTO usage_hours (account_id, day, hour, pickups, notifications)
           SELECT $1, $2, t.* FROM jsonb_to_recordset($3) AS t(hour smallint, pickups int, notifications int)`,
          [accountId, day.date, JSON.stringify(hours)],
        );
        await client.query(
          `INSERT INTO app_usage (account_id, day, hour, position, app_id, app_name, category, seconds, opens)
           SELECT $1, $2, t.* FROM jsonb_to_recordset($3)
             AS t(hour smallint, position smallint, app_id text, app_name text, category text, seconds int, opens int)`,
          [accountId, day.date, JSON.stringify(apps)],
        );
      });
    },

    async getUsageDays(accountId, firstDate, lastDate) {
      const params = [accountId, firstDate, lastDate];
      const range = 'account_id = $1 AND day BETWEEN $2 AND $3';
      const [days, hours, apps] = await Promise.all([
        query(`SELECT day, longest_focus_minutes FROM usage_days WHERE ${range} ORDER BY day`, params),
        query(`SELECT day, hour, pickups, notifications FROM usage_hours WHERE ${range} ORDER BY day, hour`, params),
        query(
          `SELECT day, hour, app_id, app_name, category, seconds, opens FROM app_usage WHERE ${range}
           ORDER BY day, hour, position`,
          params,
        ),
      ]);
      return toUsageDays(days.rows, hours.rows, apps.rows);
    },

    async replaceHealthDay(accountId, day) {
      await query(
        `INSERT INTO health_days
           (account_id, day, sleep_minutes, sleep_start, sleep_end, steps, exercise_minutes, distance_meters)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (account_id, day) DO UPDATE SET
           sleep_minutes = EXCLUDED.sleep_minutes, sleep_start = EXCLUDED.sleep_start, sleep_end = EXCLUDED.sleep_end,
           steps = EXCLUDED.steps,
           exercise_minutes = EXCLUDED.exercise_minutes, distance_meters = EXCLUDED.distance_meters,
           uploaded_at = now()`,
        [
          accountId,
          day.date,
          day.sleepMinutes,
          day.sleepStart ?? null,
          day.sleepEnd ?? null,
          day.steps,
          day.exerciseMinutes,
          day.distanceMeters,
        ],
      );
    },

    async getHealthDays(accountId, firstDate, lastDate) {
      const { rows } = await query(
        'SELECT * FROM health_days WHERE account_id = $1 AND day BETWEEN $2 AND $3 ORDER BY day',
        [accountId, firstDate, lastDate],
      );
      return rows.map(toHealthDay);
    },

    async replaceWellnessDay(accountId, { date, score, body, mind, digital }) {
      await query(
        `INSERT INTO wellness_days (account_id, day, score, body, mind, digital) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (account_id, day) DO UPDATE SET score = EXCLUDED.score, body = EXCLUDED.body,
           mind = EXCLUDED.mind, digital = EXCLUDED.digital, uploaded_at = now()`,
        [accountId, date, score, body, mind, digital],
      );
    },

    async getWellnessDays(accountId, firstDate, lastDate) {
      const { rows } = await query(
        'SELECT * FROM wellness_days WHERE account_id = $1 AND day BETWEEN $2 AND $3 ORDER BY day',
        [accountId, firstDate, lastDate],
      );
      return rows.map(toWellnessDay);
    },

    async saveDevice(accountId, { installId, platform, manufacturer, model, osVersion, appVersion }) {
      await query(
        `INSERT INTO devices (account_id, install_id, platform, manufacturer, model, os_version, app_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (account_id, install_id) DO UPDATE SET platform = EXCLUDED.platform,
           manufacturer = EXCLUDED.manufacturer, model = EXCLUDED.model, os_version = EXCLUDED.os_version,
           app_version = EXCLUDED.app_version, last_seen_at = now()`,
        [accountId, installId, platform, manufacturer ?? null, model ?? null, osVersion ?? null, appVersion ?? null],
      );
    },

    async listDevices(accountId) {
      const { rows } = await query('SELECT * FROM devices WHERE account_id = $1 ORDER BY last_seen_at DESC', [accountId]);
      return rows.map(toDevice);
    },
  };
}

module.exports = { createPostgresStore };
