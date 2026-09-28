/**
 * In-memory implementation of the store (see ./index.js for the contract).
 * For development and tests only: everything is lost when the server stops.
 */
const { randomUUID } = require('node:crypto');

const { EmailTakenError } = require('./index');

const newId = () => randomUUID().replaceAll('-', '');
// Callers get copies, so they can't change stored data by accident.
const copy = (value) => (value == null ? null : structuredClone(value));

function createMemoryStore() {
  const accounts = new Map();
  const sessions = new Map();
  const checkIns = new Map(); // accountId → CheckIn[]
  const dataSources = new Map(); // accountId → { sourceId: status }
  const usageDays = new Map(); // accountId → Map(date → UsageDay)

  const listFor = (map, accountId, empty) => {
    if (!map.has(accountId)) map.set(accountId, empty());
    return map.get(accountId);
  };

  return {
    async getAccount(accountId) {
      return copy(accounts.get(accountId));
    },

    async getAccountByEmail(email) {
      return copy([...accounts.values()].find((account) => account.email === email));
    },

    async createAccount({ email, passwordHash, timezone, id = newId() }) {
      if ([...accounts.values()].some((account) => account.email === email)) {
        throw new EmailTakenError(email);
      }
      const account = { id, email, passwordHash, timezone };
      accounts.set(id, account);
      return copy(account);
    },

    async updateAccount(accountId, changes) {
      const account = accounts.get(accountId);
      if (!account) throw new Error(`No account ${accountId}`);
      if (changes.passwordHash !== undefined) account.passwordHash = changes.passwordHash;
      if (changes.timezone !== undefined) account.timezone = changes.timezone;
      return copy(account);
    },

    async createSession(session) {
      sessions.set(session.tokenHash, copy(session));
    },

    async getSession(tokenHash) {
      return copy(sessions.get(tokenHash));
    },

    async deleteSession(tokenHash) {
      sessions.delete(tokenHash);
    },

    async createCheckIn(accountId, fields) {
      const checkIn = { id: newId(), ...fields };
      if (!checkIn.note) delete checkIn.note;
      listFor(checkIns, accountId, () => []).push(checkIn);
      return copy(checkIn);
    },

    async listCheckIns(accountId, limit) {
      const all = listFor(checkIns, accountId, () => []);
      return copy([...all].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit));
    },

    async listCheckInsBetween(accountId, start, end) {
      const all = listFor(checkIns, accountId, () => []);
      return copy(all.filter((c) => c.createdAt >= start && c.createdAt < end));
    },

    async getDataSourceStatuses(accountId) {
      return copy(listFor(dataSources, accountId, () => ({})));
    },

    async setDataSourceStatus(accountId, sourceId, status) {
      listFor(dataSources, accountId, () => ({}))[sourceId] = status;
    },

    async replaceUsageDay(accountId, day) {
      listFor(usageDays, accountId, () => new Map()).set(day.date, copy(day));
    },

    async getUsageDays(accountId, firstDate, lastDate) {
      const days = listFor(usageDays, accountId, () => new Map());
      return copy([...days.values()].filter((d) => d.date >= firstDate && d.date <= lastDate));
    },
  };
}

module.exports = { createMemoryStore };
