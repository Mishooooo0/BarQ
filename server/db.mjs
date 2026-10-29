// File-backed JSON databases (Users, Games, Payments). Every read comes from disk and every write is atomic, so the dev
// server, the production server and the tests can all share one data directory without stale caches.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { dbDir } from './paths.mjs';
import { buildSeed, DEVELOPERS_GROUP, SEED_GAMES } from './seed.mjs';

const files = { users: 'users.json', games: 'games.json', payments: 'payments.json' };
const fileFor = name => path.join(dbDir(), files[name]);

function writeJson(file, data) {
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`);
  try { renameSync(temp, file); }
  catch (error) {
    // Windows can refuse to replace a file another program has open; fall back to a direct write.
    if (error.code !== 'EPERM' && error.code !== 'EBUSY' && error.code !== 'EACCES') throw error;
    writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    rmSync(temp, { force: true });
  }
}

/** Creates any missing database from the seed. With `reset`, recreates all of them. */
export function ensureDb({ reset = false, now = new Date() } = {}) {
  mkdirSync(dbDir(), { recursive: true });
  const missing = Object.keys(files).filter(name => reset || !existsSync(fileFor(name)));
  if (missing.length) {
    const seed = buildSeed(now);
    for (const name of missing) writeJson(fileFor(name), seed[name]);
  }
  migrate();
  return missing;
}

// Upgrades databases created by older versions in place. Runs once per data directory per process.
const migrated = new Set();
function migrate() {
  if (migrated.has(dbDir())) return;
  let users;
  try { users = JSON.parse(readFileSync(fileFor('users'), 'utf8')); } catch { return; } // read() reports an unreadable file
  if (!users.groups.some(g => g.id === DEVELOPERS_GROUP.id)) {
    users.groups.unshift({ ...DEVELOPERS_GROUP, members: users.users.map(u => u.id) });
    writeJson(fileFor('users'), users);
  }
  // Older Games databases have only Flappy Bird: add the games that are missing, keeping existing ones as they are.
  try {
    const games = JSON.parse(readFileSync(fileFor('games'), 'utf8'));
    const missing = SEED_GAMES.filter(seed => !games.games.some(g => g.id === seed.id));
    if (missing.length) { games.games.push(...missing); writeJson(fileFor('games'), games); }
  } catch { /* read() reports an unreadable file */ }
  migrated.add(dbDir());
}

export function read(name) {
  ensureDb();
  try { return JSON.parse(readFileSync(fileFor(name), 'utf8')); }
  catch (error) { throw Object.assign(new Error(`The ${name} database is unreadable (${error.message}). Run npm run db:reset.`), { status: 500 }); }
}

/** Reads a database, lets `change` mutate it, and saves it only if `change` returns without throwing. */
export function update(name, change) {
  const data = read(name);
  const result = change(data);
  writeJson(fileFor(name), data);
  return result;
}
