// Places and Categories database: read-only, loaded from data/ once per process.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './paths.mjs';

function load(file, parse) {
  try { return parse(readFileSync(path.join(root, 'data', file), 'utf8')); }
  catch (error) { console.error(`[barq] Could not load data/${file}: ${error.message}`); return []; }
}

export const categories = load('categories.json', JSON.parse);
const rawPlaces = load('riyadh_all_seven_categories_v2.jsonl', text => text.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)));

// Estimated spend per person (SAR) for the dataset's Arabic price bands. Places without a band use their category's default.
const priceBands = { 'رخيص': 25, 'متوسط': 55, 'غالي': 110, 'غالي جدًا': 200 };
const bySource = new Map(categories.map(c => [c.source, c]));

export const places = rawPlaces.map(place => {
  const category = bySource.get(place.general_category);
  const rating5 = place.rating != null && place.rating_scale ? Math.round((place.rating / place.rating_scale) * 50) / 10 : null;
  return { ...place, categoryId: category?.id ?? null, rating5, estimatedCost: priceBands[place.price_category_ar] ?? category?.defaultCost ?? 50 };
});

export function findCategory(value) {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  return categories.find(c => c.id === key || c.name.toLowerCase() === key || c.source.toLowerCase() === key) ?? null;
}

export function categorySummary() {
  return categories.map(c => ({ ...c, count: places.filter(p => p.categoryId === c.id).length }));
}

export function publicPlace(place) {
  return { id: place.record_id, name: place.name, categoryId: place.categoryId, address: place.address, district: place.district ?? null, rating: place.rating5, priceLabel: place.price_category_ar ?? null, estimatedCost: place.estimatedCost };
}
