// The Arabic dictionary must cover every English text the app shows, keep every {placeholder}, use Arabic plural
// forms where the app counts things, and contain no English words or Latin digits.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dataKeys, literalKeys } from '../scripts/i18n-keys.mjs';

const { ar } = await import('../src/i18n/ar.ts');
const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
const forms = value => typeof value === 'string' ? [value] : Object.values(value);

test('every text in the app has Arabic', async () => {
  const keys = new Set([...literalKeys().map(k => k.key), ...await dataKeys()]);
  const missing = [...keys].filter(key => !(key in ar));
  assert.deepEqual(missing, [], `Missing Arabic for:\n${missing.join('\n')}`);
});

test('counted texts have Arabic plural forms', () => {
  for (const { key, file } of literalKeys().filter(k => k.plural)) {
    assert.equal(typeof ar[key], 'object', `${key} (${file}) needs Arabic plural forms`);
    assert.ok(ar[key].other, `${key} needs an "other" form`);
  }
});

test('Arabic keeps the placeholders of the English text', () => {
  for (const [key, value] of Object.entries(ar)) {
    const expected = placeholders(key);
    for (const form of forms(value)) {
      const found = placeholders(form);
      // A plural form may write the number out in words (for example "two days") instead of {n}.
      if (typeof value === 'object') assert.deepEqual(found.filter(p => p !== 'n'), expected.filter(p => p !== 'n'), `${key} → ${form}`);
      else assert.deepEqual(found, expected, `${key} → ${form}`);
    }
  }
});

test('Arabic text has no English words or Latin digits', () => {
  for (const [key, value] of Object.entries(ar)) {
    for (const form of forms(value)) {
      const text = form.replace(/\{\w+\}/g, '');
      assert.doesNotMatch(text, /[A-Za-z0-9]/, `${key} → ${form}`);
    }
  }
});
