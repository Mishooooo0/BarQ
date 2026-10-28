import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '../../components/ui/Primitives';

type Place = { record_id: string; name: string; general_category: string; address: string; rating: number | null; rating_scale: number | null; price_category_ar: string | null };
type Category = { name: string; count: number };

export function Places() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { fetch('/api/categories').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(setCategories).catch(() => setError('Places service is unavailable.')); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: '100' });
    if (category) params.set('category', category);
    if (query.trim()) params.set('q', query.trim());
    fetch(`/api/places?${params}`, { signal: controller.signal }).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(data => { setPlaces(data.items); setError(''); }).catch(err => { if (err.name !== 'AbortError') setError('Places service is unavailable.'); });
    return () => controller.abort();
  }, [category, query]);
  return <><PageHeader title="Places"><Link to="/more">Back</Link></PageHeader><div className="detail-content"><label>Search Riyadh places<input aria-label="Search Riyadh places" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Category<select aria-label="Place category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}</select></label>{error && <p role="alert">{error} Start the API with npm run api.</p>}{places.map(p => <article key={p.record_id} className="product-row"><div><h3>{p.name}</h3><p>{p.general_category} · {p.address}</p><p>{p.price_category_ar || 'Price unknown'}{p.rating != null ? ` · ${p.rating}/${p.rating_scale}` : ''}</p></div></article>)}</div></>;
}
