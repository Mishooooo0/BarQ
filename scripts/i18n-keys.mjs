// Lists every English text the app translates, so tests can check that src/i18n/ar.ts has Arabic for all of it.
// Literal keys come from t('…'), tp(n, '…', '…') and tn('…') calls in src; data keys come from the catalogs and the
// server text that the app translates when it shows it.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = dir => readdirSync(dir).flatMap(name => { const full = path.join(dir, name); return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : []; });
const STRING = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"`;
const unescape = text => text.replace(/\\(['"\\])/g, '$1');

/** Keys used directly in the code, as { key, plural, file }. */
export function literalKeys() {
  const found = [];
  for (const file of files(path.join(root, 'src'))) {
    if (file.endsWith(path.join('i18n', 'ar.ts'))) continue;
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(new RegExp(String.raw`\b(?:t|tn)\(\s*(?:${STRING})`, 'g'))) found.push({ key: unescape(match[1] ?? match[2]), plural: false, file });
    for (const match of text.matchAll(new RegExp(String.raw`\btp\([^,]+,\s*(?:${STRING})\s*,\s*(?:${STRING})`, 'g'))) found.push({ key: unescape(match[3] ?? match[4]), plural: true, file });
    // t(condition ? 'a' : 'b', …) and tn(x === 'y' ? 'a' : 'b', …): both branches are keys.
    for (const match of text.matchAll(new RegExp(String.raw`\b(?:t|tn)\([\w.]+(?:\s*===\s*'[^']*')?\s*\?\s*(?:${STRING})\s*:\s*(?:${STRING})`, 'g'))) found.push({ key: unescape(match[1] ?? match[2]), plural: false, file }, { key: unescape(match[3] ?? match[4]), plural: false, file });
  }
  return found;
}

/** Fixed (no names or numbers) error messages the server and the API client can send. */
export function serverMessages() {
  const out = new Set();
  const fixed = new RegExp(String.raw`(?:fail\(\d+,\s*|bad\(|new (?:GameError|HttpError|AiError)\(\d+,\s*)(?:${STRING})\)`, 'g');
  for (const file of ['server/api.mjs', 'server/occasions.mjs', 'server/games.mjs', 'server/ai.mjs']) {
    const text = readFileSync(path.join(root, file), 'utf8');
    for (const match of text.matchAll(fixed)) out.add(unescape(match[1] ?? match[2]));
    for (const match of text.matchAll(/fail\(\d+, [^)]*\? '([^']+)' : '([^']+)'\)/g)) { out.add(match[1]); out.add(match[2]); }
  }
  for (const message of ['Request body is too large.', 'Request body is not valid JSON.', 'Send a JSON object.', 'Something went wrong on the server.', 'Not found.', 'Method not allowed.', 'User not found.', 'Invalid URL.']) out.add(message);
  const client = readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');
  for (const match of client.matchAll(new RegExp(STRING, 'g'))) {
    const text = unescape(match[1] ?? match[2]);
    if (/^[A-Z].* .*\.$/.test(text) && !text.includes('${')) out.add(text);
  }
  // Engine-specific messages never reach users (server/ai.mjs turns them into "Barq AI could not answer…").
  return [...out].filter(text => !text.includes('${') && !/Claude-Dev|Ring API/.test(text));
}

/** Keys passed to t() as values: catalog names, server labels and the server's fixed messages. */
export async function dataKeys() {
  const mock = readFileSync(path.join(root, 'src/data/mock/index.ts'), 'utf8');
  const keys = [...mock.matchAll(/(?:name|detail|description): '((?:[^'\\]|\\.)*)'/g)].map(m => unescape(m[1]).replace(/\\n/g, '\n'));
  const { OCCASION_TYPES } = await import(pathToFileURL(path.join(root, 'server/occasions.mjs')).href);
  for (const type of OCCASION_TYPES) keys.push(type.name, ...type.lines.map(([label]) => label));
  const { SEED_GAMES } = await import(pathToFileURL(path.join(root, 'server/seed.mjs')).href);
  for (const game of SEED_GAMES) keys.push(game.name, game.description);
  keys.push('Careem / Uber estimate', 'Wallet top-up', 'Saving box', 'From Saving box', 'barq Market order', 'Spin the Wheel reward', 'Group bill (games)', 'split bill', 'my share', 'bill');
  keys.push('barq wallet', 'local bank', 'international', 'added to the box', 'back to the wallet');
  keys.push('Food', 'Cafe', 'Health', 'Shopping', 'Groceries', 'Transportation', 'Entertainment');
  // Field names and reasons that src/i18n/messages.ts fills into translated server messages.
  keys.push('Merchant', 'Name', 'Label', 'Group name', 'Each line needs a name', 'Each Eidia needs a name', 'an amount', 'a budget', 'a bill amount', 'a goal', 'each amount', 'each Eidia');
  keys.push('it took too long', 'it is busy', 'it could not be reached', 'it returned an error', 'its answer was unusable');
  keys.push(...serverMessages());
  return keys;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const literal = literalKeys(); const data = await dataKeys();
  const all = [...new Set([...literal.map(k => k.key), ...data])];
  console.log(JSON.stringify({ count: all.length, plural: [...new Set(literal.filter(k => k.plural).map(k => k.key))], keys: all }, null, 1));
}
