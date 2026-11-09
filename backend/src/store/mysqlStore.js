/**
 * MySQL implementation of the store (see ./index.js for the contract).
 * Tables are in ./schema.mysql.sql and are created on first use, along with
 * the database itself if it doesn't exist yet.
 */
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const { EmailTakenError } = require('./index');
const { newId, toAccount, toSession, toCheckIn, toHealthDay, toWellnessDay, toDevice, usageRows, toUsageDays } = require('./rows');

const SCHEMA_STATEMENTS = fs
  .readFileSync(path.join(__dirname, 'schema.mysql.sql'), 'utf8')
  .replace(/--.*$/gm, '')
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

/**
 * @param {{ host?: string, port?: number, user?: string, password?: string, database: string, ssl?: object }} options
 *   Or `{ uri: 'mysql://user:password@host:3306/database' }`.
 */
function createMysqlStore(options) {
  const { uri, ...rest } = options;
  const settings = uri ? { ...fromUri(uri), ...rest } : rest;
  const { database } = settings;
  if (!/^\w+$/.test(database ?? '')) throw new Error('The MySQL database name must be letters, digits or _');

  const connection = { ...settings, timezone: 'Z', dateStrings: ['DATE'] }; // UTC Dates; DATE as "YYYY-MM-DD"
  const pool = mysql.createPool({ ...connection, connectionLimit: 5, maxIdle: 0, enableKeepAlive: true });
  // NOW() defaults are stored in UTC too.
  pool.pool.on('connection', (conn) => conn.query("SET time_zone = '+00:00'"));
  let ready = null;

  /** Creates the database and tables once, before the first query. */
  function migrate() {
    ready ??= (async () => {
      const conn = await mysql.createConnection({ ...connection, database: undefined });
      try {
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4`);
        await conn.query(`USE \`${database}\``);
        for (const statement of SCHEMA_STATEMENTS) {
          try {
            await conn.query(statement);
          } catch (err) {
            // ALTER TABLE … ADD COLUMN on a database that already has it.
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
          }
        }
      } finally {
        await conn.end();
      }
    })().catch((err) => {
      ready = null;
      throw err;
    });
    return ready;
  }

  async function query(sql, params) {
    await migrate();
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  async function transaction(work) {
    await migrate();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await work(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  return {
    migrate,
    close: () => pool.end(),

    async getAccount(accountId) {
      return toAccount((await query('SELECT * FROM accounts WHERE id = ?', [accountId]))[0]);
    },

    async getAccountByEmail(email) {
      return toAccount((await query('SELECT * FROM accounts WHERE email = ?', [email]))[0]);
    },

    async createAccount({ email, passwordHash, timezone, id = newId() }) {
      try {
        await query('INSERT INTO accounts (id, email, password_hash, timezone) VALUES (?, ?, ?, ?)', [
          id,
          email,
          passwordHash,
          timezone,
        ]);
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') throw new EmailTakenError(email);
        throw err;
      }
      return { id, email, passwordHash, timezone };
    },

    async updateAccount(accountId, changes) {
      await query(
        'UPDATE accounts SET password_hash = COALESCE(?, password_hash), timezone = COALESCE(?, timezone) WHERE id = ?',
        [changes.passwordHash ?? null, changes.timezone ?? null, accountId],
      );
      const account = await this.getAccount(accountId);
      if (!account) throw new Error(`No account ${accountId}`);
      return account;
    },

    async createSession({ tokenHash, accountId, createdAt, expiresAt }) {
      await query('INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)', [
        tokenHash,
        accountId,
        createdAt,
        expiresAt,
      ]);
    },

    async getSession(tokenHash) {
      return toSession((await query('SELECT * FROM sessions WHERE token_hash = ?', [tokenHash]))[0]);
    },

    async deleteSession(tokenHash) {
      await query('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
    },

    async createCheckIn(accountId, { createdAt, localDay, mood, energy, focus, note, kind, sleepQuality }) {
      const id = newId();
      await query(
        `INSERT INTO check_ins (id, account_id, created_at, local_day, mood, energy, focus, note, kind, sleep_quality)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, accountId, createdAt, localDay ?? null, mood, energy, focus, note || null, kind ?? null, sleepQuality ?? null],
      );
      return toCheckIn((await query('SELECT * FROM check_ins WHERE id = ?', [id]))[0]);
    },

    async listCheckIns(accountId, limit) {
      const rows = await query('SELECT * FROM check_ins WHERE account_id = ? ORDER BY created_at DESC LIMIT ?', [
        accountId,
        limit,
      ]);
      return rows.map(toCheckIn);
    },

    async listCheckInsBetween(accountId, start, end) {
      const rows = await query(
        'SELECT * FROM check_ins WHERE account_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at',
        [accountId, start, end],
      );
      return rows.map(toCheckIn);
    },

    async getDataSourceStatuses(accountId) {
      const rows = await query('SELECT source_id, status FROM data_sources WHERE account_id = ?', [accountId]);
      return Object.fromEntries(rows.map((row) => [row.source_id, row.status]));
    },

    async setDataSourceStatus(accountId, sourceId, status) {
      await query(
        `INSERT INTO data_sources (account_id, source_id, status) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP(3)`,
        [accountId, sourceId, status],
      );
    },

    async replaceUsageDay(accountId, day) {
      const { hours, apps } = usageRows(day);
      await transaction(async (conn) => {
        // Deleting the day cascades to its hours and app rows.
        await conn.query('DELETE FROM usage_days WHERE account_id = ? AND day = ?', [accountId, day.date]);
        await conn.query('INSERT INTO usage_days (account_id, day, longest_focus_minutes) VALUES (?, ?, ?)', [
          accountId,
          day.date,
          day.longestFocusMinutes,
        ]);
        if (hours.length) {
          await conn.query('INSERT INTO usage_hours (account_id, day, hour, pickups, notifications) VALUES ?', [
            hours.map((h) => [accountId, day.date, h.hour, h.pickups, h.notifications]),
          ]);
        }
        if (apps.length) {
          await conn.query(
            `INSERT INTO app_usage (account_id, day, hour, position, app_id, app_name, category, seconds, opens)
             VALUES ?`,
            [apps.map((a) => [accountId, day.date, a.hour, a.position, a.app_id, a.app_name, a.category, a.seconds, a.opens])],
          );
        }
      });
    },

    async getUsageDays(accountId, firstDate, lastDate) {
      const params = [accountId, firstDate, lastDate];
      const range = 'account_id = ? AND day BETWEEN ? AND ?';
      const [days, hours, apps] = await Promise.all([
        query(`SELECT day, longest_focus_minutes FROM usage_days WHERE ${range} ORDER BY day`, params),
        query(`SELECT day, hour, pickups, notifications FROM usage_hours WHERE ${range} ORDER BY day, hour`, params),
        query(
          `SELECT day, hour, app_id, app_name, category, seconds, opens FROM app_usage WHERE ${range}
           ORDER BY day, hour, position`,
          params,
        ),
      ]);
      return toUsageDays(days, hours, apps);
    },

    async replaceHealthDay(accountId, day) {
      await query(
        `INSERT INTO health_days
           (account_id, day, sleep_minutes, sleep_start, sleep_end, steps, exercise_minutes, distance_meters)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           sleep_minutes = VALUES(sleep_minutes), sleep_start = VALUES(sleep_start), sleep_end = VALUES(sleep_end),
           steps = VALUES(steps),
           exercise_minutes = VALUES(exercise_minutes), distance_meters = VALUES(distance_meters),
           uploaded_at = CURRENT_TIMESTAMP(3)`,
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
      const rows = await query('SELECT * FROM health_days WHERE account_id = ? AND day BETWEEN ? AND ? ORDER BY day', [
        accountId,
        firstDate,
        lastDate,
      ]);
      return rows.map(toHealthDay);
    },

    async replaceWellnessDay(accountId, { date, score, body, mind, digital }) {
      await query(
        `INSERT INTO wellness_days (account_id, day, score, body, mind, digital) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE score = VALUES(score), body = VALUES(body), mind = VALUES(mind),
           digital = VALUES(digital), uploaded_at = CURRENT_TIMESTAMP(3)`,
        [accountId, date, score, body, mind, digital],
      );
    },

    async getWellnessDays(accountId, firstDate, lastDate) {
      const rows = await query(
        'SELECT * FROM wellness_days WHERE account_id = ? AND day BETWEEN ? AND ? ORDER BY day',
        [accountId, firstDate, lastDate],
      );
      return rows.map(toWellnessDay);
    },

    async saveDevice(accountId, { installId, platform, manufacturer, model, osVersion, appVersion }) {
      await query(
        `INSERT INTO devices (account_id, install_id, platform, manufacturer, model, os_version, app_version)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE platform = VALUES(platform), manufacturer = VALUES(manufacturer),
           model = VALUES(model), os_version = VALUES(os_version), app_version = VALUES(app_version),
           last_seen_at = CURRENT_TIMESTAMP(3)`,
        [accountId, installId, platform, manufacturer ?? null, model ?? null, osVersion ?? null, appVersion ?? null],
      );
    },

    async listDevices(accountId) {
      const rows = await query('SELECT * FROM devices WHERE account_id = ? ORDER BY last_seen_at DESC', [accountId]);
      return rows.map(toDevice);
    },
  };
}

function fromUri(uri) {
  const url = new URL(uri);
  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1) || 'smartfocus',
  };
}

module.exports = { createMysqlStore };
