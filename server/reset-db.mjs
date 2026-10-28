// npm run db:reset: rebuilds the Users and Games databases from server/seed.mjs.
import { ensureDb } from './db.mjs';
import { dbDir } from './paths.mjs';

ensureDb({ reset: true });
console.log(`Users and Games databases recreated in ${dbDir()}.`);
