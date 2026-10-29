import { useCallback, useEffect, useState } from 'react';
import { DetailHeader, ErrorState } from '../../components/ui/Primitives';
import { api, errorMessage, isAbort } from '../../lib/api';
import type { CategoryTemplate, PlaceRecord } from '../../types/api';
import { num, sar, t } from '../../i18n';
import { categoryName } from '../../i18n/data';

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
  return <><DetailHeader title={t('Places')} fallback="/more" /><div className="detail-content places-content"><label className="field-label">{t('Search Riyadh places')}<input aria-label={t('Search Riyadh places')} placeholder={t('Name, street or district')} value={query} onChange={e => setQuery(e.target.value)} /></label><label className="field-label">{t('Category')}<select aria-label={t('Place category')} value={category} onChange={e => setCategory(e.target.value)}><option value="">{t('All categories')}</option>{categories.map(c => <option key={c.id} value={c.id}>{categoryName(c.id)} ({num(c.count)})</option>)}</select></label>
    {error ? <ErrorState message={error} onRetry={retry} /> : places === null ? <p className="muted" role="status">{t('Loading places…')}</p> : !places.length ? <p className="muted">{t('No places match your search.')}</p>
      : places.map(p => <article key={p.record_id} className="product-row"><div><h3><bdi>{p.name}</bdi></h3><p>{categoryName(p.categoryId)} · {p.address}</p><p>{p.price_category_ar ?? t('About {amount}', { amount: sar(p.estimatedCost) })}{p.rating5 != null ? ` · ★ ${num(p.rating5, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : ''}</p></div></article>)}</div></>;
}
