// Production server: the API plus the built UI from dist/, with the app shell returned for client-side routes.
import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { handleApi, sendJson } from './api.mjs';
import { ensureDb } from './db.mjs';
import { root } from './paths.mjs';

const dist = path.join(root, 'dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const missingBuild = '<!doctype html><meta charset="utf-8"><title>barq</title><body style="font-family:system-ui;padding:40px"><h1>The UI has not been built yet</h1><p>Run <code>npm run build</code>, or use <code>npm run dev</code> while developing. The API is running.</p>';

function serveStatic(req, res, url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return sendJson(res, 400, { error: 'Invalid path.' }); }
  const requested = path.resolve(dist, `.${pathname}`);
  if (requested !== dist && !requested.startsWith(dist + path.sep)) return sendJson(res, 403, { error: 'Forbidden.' });
  const file = existsSync(requested) && statSync(requested).isFile() ? requested : (path.extname(pathname) ? null : path.join(dist, 'index.html'));
  if (!file) return sendJson(res, 404, { error: 'Not found.' });
  if (!existsSync(file)) { res.writeHead(503, { 'content-type': 'text/html; charset=utf-8' }); return res.end(missingBuild); }
  const body = readFileSync(file);
  // Hashed assets can be cached forever; the HTML shell must always be fresh so new builds are picked up.
  const cache = file.startsWith(path.join(dist, 'assets')) ? 'public, max-age=31536000, immutable' : 'no-cache';
  res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'content-length': body.length, 'cache-control': cache });
  res.end(req.method === 'HEAD' ? undefined : body);
}

export async function handler(req, res) {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { return sendJson(res, 400, { error: 'Invalid URL.' }); }
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return handleApi(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed.' });
  try { serveStatic(req, res, url); }
  catch (error) { console.error('[barq]', error); sendJson(res, 500, { error: 'Something went wrong on the server.' }); }
}

export function startServer({ host = '127.0.0.1', port = 3001, label = 'BarQ API' } = {}) {
  const created = ensureDb();
  if (created.length) console.log(`Created ${created.join(' and ')} database${created.length > 1 ? 's' : ''} in ${process.env.BARQ_DB_DIR || 'data/db'}.`);
  const server = http.createServer(handler);
  server.listen(port, host, () => console.log(`${label} listening on http://${host}:${port}`));
  return server;
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/server/index.mjs')) startServer({ port: Number(process.env.PORT || 3001) });
