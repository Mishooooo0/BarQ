import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from './index.mjs';

function get(url) {
  let status;
  let body;
  handler({ method: 'GET', url }, { writeHead(value) { status = value; }, end(value) { body = JSON.parse(value); } });
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
