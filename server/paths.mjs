import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const dbDir = () => path.resolve(root, process.env.BARQ_DB_DIR || 'data/db');
