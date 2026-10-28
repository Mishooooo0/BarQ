import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from './index.mjs';

function get(url) {
  let status;
  let body;
  let contentType;
  handler({ method: 'GET', url }, { writeHead(value, headers) { status = value; contentType = headers['content-type']; }, end(value) { body = contentType.startsWith('application/json') ? JSON.parse(value) : value?.toString(); } });
  return { status, body };
}

test('seven categories include all 208 records', () => {
  const { status, body } = get('/api/categories');
  assert.equal(status, 200);
  assert.equal(body.length, 7);
  assert.equal(body.reduce((sum, item) => sum + item.count, 0), 208);
});

test('places can be filtered and paginated', () => {
  const { status, body } = get('/api/places?category=Groceries&limit=2&offset=1');
  assert.equal(status, 200);
  assert.equal(body.total, 10);
  assert.equal(body.items.length, 2);
  assert.ok(body.items.every(item => item.general_category === 'Groceries'));
});

test('missing place returns 404', () => assert.equal(get('/api/places/unknown').status, 404));

test('direct UI routes return the app shell', () => {
  const { status, body } = get('/rewards/wheel');
  assert.equal(status, 200);
  assert.match(body, /<div id="root"><\/div>/);
});

test('unknown API routes stay 404', () => assert.equal(get('/api/missing').status, 404));
