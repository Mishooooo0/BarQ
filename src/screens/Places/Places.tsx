import { useCallback, useEffect, useState } from 'react';
import { DetailHeader, ErrorState } from '../../components/ui/Primitives';
import { api, errorMessage, isAbort } from '../../lib/api';
import type { CategoryTemplate, PlaceRecord } from '../../types/api';

export function Places() {
  const [categories, setCategories] = useState<CategoryTemplate[]>([]);
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<PlaceRecord[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => { setError(''); setAttempt(n => n + 1); }, []);
  useEffect(() => { api<CategoryTemplate[]>('/api/categories').then(setCategories).catch(e => setError(errorMessage(e))); }, [attempt]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: '100' });
    if (category) params.set('category', category);
    if (query.trim()) params.set('q', query.trim());
    const timer = setTimeout(() => {
      api<{ items: PlaceRecord[] }>(`/api/places?${params}`, { signal: controller.signal }).then(data => { setPlaces(data.items); setError(''); }).catch(e => { if (!isAbort(e) && !controller.signal.aborted) setError(errorMessage(e)); });
    }, query ? 200 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [category, query, attempt]);
  return <><DetailHeader title="Places" fallback="/more" /><div className="detail-content places-content"><label className="field-label">Search Riyadh places<input aria-label="Search Riyadh places" placeholder="Name, street or district" value={query} onChange={e => setQuery(e.target.value)} /></label><label className="field-label">Category<select aria-label="Place category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}</select></label>
    {error ? <ErrorState message={error} onRetry={retry} /> : places === null ? <p className="muted" role="status">Loading places…</p> : !places.length ? <p className="muted">No places match your search.</p>
      : places.map(p => <article key={p.record_id} className="product-row"><div><h3>{p.name}</h3><p>{categories.find(c => c.id === p.categoryId)?.name ?? p.general_category} · {p.address}</p><p>{p.price_category_ar ?? `About SAR ${p.estimatedCost}`}{p.rating5 != null ? ` · ★ ${p.rating5.toFixed(1)}` : ''}</p></div></article>)}</div></>;
}
