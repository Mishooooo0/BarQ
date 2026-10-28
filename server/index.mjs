import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const places = readFileSync(new URL('../data/riyadh_all_seven_categories_v2.jsonl', import.meta.url), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const categories = [...new Set(places.map(p => p.general_category))].sort();
const port = Number(process.env.PORT || 3001);
const dist = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };

export function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { return send(res, 400, { error: 'Invalid URL' }); }
  if (url.pathname === '/api/health') return send(res, 200, { status: 'ok', places: places.length });
  if (url.pathname === '/api/categories') return send(res, 200, categories.map(name => ({ name, count: places.filter(p => p.general_category === name).length })));
  if (url.pathname === '/api/places') {
    const category = url.searchParams.get('category');
    const query = (url.searchParams.get('q') || '').trim().toLocaleLowerCase();
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
    const found = places.filter(p => (!category || p.general_category === category) && (!query || `${p.name} ${p.address} ${p.district || ''}`.toLocaleLowerCase().includes(query)));
    return send(res, 200, { total: found.length, limit, offset, items: found.slice(offset, offset + limit) });
  }
  const match = url.pathname.match(/^\/api\/places\/([^/]+)$/);
  if (match) {
    let id;
    try { id = decodeURIComponent(match[1]); } catch { return send(res, 400, { error: 'Invalid place ID' }); }
    const place = places.find(p => p.record_id === id);
    return place ? send(res, 200, place) : send(res, 404, { error: 'Place not found' });
  }
  if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Not found' });
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return send(res, 400, { error: 'Invalid path' }); }
  const requested = path.resolve(dist, `.${pathname}`);
  if (requested !== dist && !requested.startsWith(dist + path.sep)) return send(res, 403, { error: 'Forbidden' });
  const file = existsSync(requested) && statSync(requested).isFile() ? requested : (path.extname(pathname) ? null : path.join(dist, 'index.html'));
  if (!file || !existsSync(file)) return send(res, 404, { error: 'Not found' });
  const body = readFileSync(file);
  res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'content-length': body.length });
  res.end(req.method === 'HEAD' ? undefined : body);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/server/index.mjs')) {
  http.createServer(handler).listen(port, '127.0.0.1', () => console.log(`BarQ API listening on http://127.0.0.1:${port}`));
}
