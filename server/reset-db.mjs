// npm run db:reset: rebuilds the Users, Games and Payments databases from server/seed.mjs.
import { ensureDb } from './db.mjs';
import { dbDir } from './paths.mjs';

ensureDb({ reset: true });
console.log(`Users, Games and Payments databases recreated in ${dbDir()}.`);
