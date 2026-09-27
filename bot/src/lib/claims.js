// Tracks per-user usage in a rolling 24h window, persisted to a JSON file.
// Mirrors the "no database, just JSON on disk" approach used by sybi-site.
// Safe for a single bot process (don't run more than one instance).

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const WINDOW_MS = 24 * 60 * 60 * 1000;

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function load(name) {
  try {
    const raw = fs.readFileSync(filePath(name), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function save(name, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

/**
 * Returns the sum of `amount` values this user has logged for `name`
 * within the last 24h, and prunes anything older while it's at it.
 */
function usedInWindow(name, userId) {
  const store = load(name);
  const now = Date.now();
  const entries = (store[userId] || []).filter((e) => now - e.t < WINDOW_MS);
  store[userId] = entries;
  save(name, store);
  return entries.reduce((sum, e) => sum + e.amount, 0);
}

/** Counts entries in the last 24h (for things you cap by count, not amount). */
function countInWindow(name, userId) {
  const store = load(name);
  const now = Date.now();
  const entries = (store[userId] || []).filter((e) => now - e.t < WINDOW_MS);
  store[userId] = entries;
  save(name, store);
  return entries.length;
}

function record(name, userId, amount) {
  const store = load(name);
  const now = Date.now();
  const entries = (store[userId] || []).filter((e) => now - e.t < WINDOW_MS);
  entries.push({ t: now, amount });
  store[userId] = entries;
  save(name, store);
}

/** Milliseconds until the oldest entry in the window falls out of it. */
function msUntilReset(name, userId) {
  const store = load(name);
  const entries = store[userId] || [];
  if (entries.length === 0) return 0;
  const oldest = Math.min(...entries.map((e) => e.t));
  return Math.max(0, WINDOW_MS - (Date.now() - oldest));
}

module.exports = { usedInWindow, countInWindow, record, msUntilReset };
