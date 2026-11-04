const { createApp } = require('./app');
const config = require('./config');
const { addDemoAccount, EMAIL, PASSWORD } = require('./demoData');
const { createMemoryStore } = require('./store/memoryStore');
const { createPostgresStore } = require('./store/postgresStore');

async function makeStore() {
  if (!config.databaseUrl) {
    console.warn('DATABASE_URL is not set, so data is kept in memory and lost when the server stops.');
    return createMemoryStore();
  }
  const store = createPostgresStore({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  });
  await store.migrate(); // creates any missing tables
  console.log('Storing data in PostgreSQL.');
  return store;
}

async function main() {
  const store = await makeStore();

  if (config.demoAccount) {
    if (!(await store.getAccountByEmail(EMAIL))) await addDemoAccount(store);
    console.log(`Demo account ready: ${EMAIL} / ${PASSWORD}`);
  }

  createApp({ store }).listen(config.port, () => {
    console.log(`SmartFocus API running on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
