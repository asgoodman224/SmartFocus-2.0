/**
 * Picks the store from the settings: PostgreSQL or MySQL when configured,
 * otherwise in memory.
 */
const { createMemoryStore } = require('./memoryStore');

/**
 * @param {{
 *   databaseUrl?: string | null,  // postgres://… or mysql://…
 *   mysql?: { host, port, user, password, database } | null,
 *   ssl?: boolean,
 *   name?: string,                // tests: use this Postgres schema / MySQL database instead
 * }} options
 * @returns {{ store, kind: 'postgres' | 'mysql' | 'memory' }}
 */
function connectStore({ databaseUrl, mysql, ssl, name } = {}) {
  const sslOptions = ssl ? { rejectUnauthorized: false } : undefined;
  const scheme = databaseUrl ? new URL(databaseUrl).protocol.replace(':', '') : null;

  if (scheme === 'postgres' || scheme === 'postgresql') {
    const { createPostgresStore } = require('./postgresStore');
    return { kind: 'postgres', store: createPostgresStore({ connectionString: databaseUrl, ssl: sslOptions, schema: name }) };
  }
  if (scheme === 'mysql' || (!scheme && mysql)) {
    const { createMysqlStore } = require('./mysqlStore');
    const settings = scheme ? { uri: databaseUrl } : mysql;
    return { kind: 'mysql', store: createMysqlStore({ ...settings, ssl: sslOptions, ...(name && { database: name }) }) };
  }
  if (scheme) throw new Error(`DATABASE_URL must start with postgres:// or mysql://, not ${scheme}://`);
  return { kind: 'memory', store: createMemoryStore() };
}

module.exports = { connectStore };
