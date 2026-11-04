const { createApp } = require('./app');
const config = require('./config');
const { addDemoAccount, EMAIL, PASSWORD } = require('./demoData');
const { connectStore } = require('./store/connect');

const STORAGE = {
  memory: 'No database is configured, so data is kept in memory and lost when the server stops.',
  postgres: 'Storing data in PostgreSQL.',
  mysql: 'Storing data in MySQL.',
};

async function main() {
  const { store, kind } = connectStore({ databaseUrl: config.databaseUrl, mysql: config.mysql, ssl: config.databaseSsl });
  if (store.migrate) await store.migrate(); // creates any missing tables
  console[kind === 'memory' ? 'warn' : 'log'](STORAGE[kind]);

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
