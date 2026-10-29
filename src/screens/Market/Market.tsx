import { Box, ChevronRight, Heart, MapPin, Search, ShoppingCart, X } from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';
import { categories, products } from '../../data/mock';
import { useWallet } from '../../app/WalletProvider';
import { useSheet } from '../../hooks/useSheet';
import { Artwork } from '../../components/ui/Artwork';
import { EmptyState, IconButton, Money, PageHeader } from '../../components/ui/Primitives';
import { num, t, tp } from '../../i18n';

export function Market() {
  const [query, setQuery] = useState(''); const [favoritesOnly, setFavoritesOnly] = useState(false); const { state } = useWallet(); const { open } = useSheet();
  const normalized = query.trim().toLowerCase();
  // Search matches the English and the shown (translated) names.
  const results = products.filter(p => (!favoritesOnly || state.favorites.includes(p.id)) && `${p.name} ${p.category} ${p.detail} ${t(p.name)} ${t(p.detail)}`.toLowerCase().includes(normalized));
  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  return <><PageHeader title={t('Market')}><div className="market-switch"><IconButton label={t('Browse categories')} className="transparent" onClick={() => open('categories')}><Box /></IconButton><IconButton label={t('Favorites')} aria-pressed={favoritesOnly} className="transparent" onClick={() => setFavoritesOnly(!favoritesOnly)}><Heart fill={favoritesOnly ? 'currentColor' : 'none'} /></IconButton></div><Link to="/market/cart" className="icon-button cart-button" aria-label={cartCount ? tp(cartCount, 'Shopping cart, {n} item', 'Shopping cart, {n} items') : t('Shopping cart')}><ShoppingCart />{cartCount > 0 && <span className="cart-badge">{num(cartCount)}</span>}</Link></PageHeader><div className="market-content"><label className="search-bar"><Search aria-hidden="true" /><input aria-label={t('Search market')} placeholder={t('Search')} value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label={t('Clear search')} onClick={() => setQuery('')}><X size={18} /></button>}</label>{query || favoritesOnly ? <div className="market-results"><h2>{favoritesOnly ? t('Your favorites') : t('Search results')}</h2>{results.length ? results.map(product => <Link to={`/market/product/${product.id}`} className="product-row" key={product.id}><span className="product-swatch" style={{ background: product.color }}>{t(product.name).slice(0, 1)}</span><div><h3>{t(product.name)}</h3><p>{t(product.detail)}</p><Money amount={product.price} /></div></Link>) : <EmptyState title={favoritesOnly ? t('No favorites yet') : t('No matches found')}>{favoritesOnly ? t('Open a product and tap its heart to save it here.') : t('Try Xbox, stc, eSIM or a category name.')}</EmptyState>}</div> : <><Link className="pay-places-card" to="/market/pay"><span className="service-icon"><MapPin strokeWidth={1.7} /></span><div><strong>{t('Pay at places')}</strong><span>{t('{count} Riyadh places · pick the date', { count: 208 })}</span></div><ChevronRight size={20} /></Link><div className="market-grid">{categories.map(category => <Link className="category-card" key={category.id} to={`/market/category/${category.id}`}><Artwork source="market" region={category.art} /><div><h2>{t(category.name)}</h2><p>{t(category.description)}</p></div></Link>)}</div></>}</div></>;
}
