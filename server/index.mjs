import http from 'node:http';
import { readFileSync } from 'node:fs';

const places = readFileSync(new URL('../data/riyadh_all_seven_categories_v2.jsonl', import.meta.url), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const categories = [...new Set(places.map(p => p.general_category))].sort();
const port = Number(process.env.PORT || 3001);
const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };

export function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  const url = new URL(req.url, 'http://localhost');
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
    const place = places.find(p => p.record_id === decodeURIComponent(match[1]));
    return place ? send(res, 200, place) : send(res, 404, { error: 'Place not found' });
  }
  send(res, 404, { error: 'Not found' });
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/server/index.mjs')) {
  http.createServer(handler).listen(port, '127.0.0.1', () => console.log(`BarQ API listening on http://127.0.0.1:${port}`));
}
