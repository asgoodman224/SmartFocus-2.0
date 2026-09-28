const { createApp } = require('./app');
const config = require('./config');
const { addDemoAccount, EMAIL, PASSWORD } = require('./demoData');
const { createMemoryStore } = require('./store/memoryStore');

async function main() {
  // TODO: use the MySQL store once it exists (see src/store/index.js).
  const store = createMemoryStore();
  console.warn('Using the in-memory store: data is lost when the server stops.');

  if (config.demoAccount) {
    await addDemoAccount(store);
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
