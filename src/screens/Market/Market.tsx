import { Box, Heart, Search, ShoppingCart, X } from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';
import { categories, products } from '../../data/mock';
import { useWallet } from '../../app/WalletProvider';
import { useSheet } from '../../hooks/useSheet';
import { Artwork } from '../../components/ui/Artwork';
import { EmptyState, IconButton, Money, PageHeader } from '../../components/ui/Primitives';

export function Market() {
  const [query, setQuery] = useState(''); const [favoritesOnly, setFavoritesOnly] = useState(false); const { state } = useWallet(); const { open } = useSheet();
  const normalized = query.trim().toLowerCase();
  const results = products.filter(p => (!favoritesOnly || state.favorites.includes(p.id)) && `${p.name} ${p.category} ${p.detail}`.toLowerCase().includes(normalized));
  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  return <><PageHeader title="Market"><div className="market-switch"><IconButton label="Browse categories" className="transparent" onClick={() => open('categories')}><Box /></IconButton><IconButton label="Favorites" aria-pressed={favoritesOnly} className="transparent" onClick={() => setFavoritesOnly(!favoritesOnly)}><Heart fill={favoritesOnly ? 'currentColor' : 'none'} /></IconButton></div><Link to="/market/cart" className="icon-button cart-button" aria-label={`Shopping cart${cartCount ? `, ${cartCount} items` : ''}`}><ShoppingCart />{cartCount > 0 && <span className="cart-badge">{cartCount}</span>}</Link></PageHeader><div className="market-content"><label className="search-bar"><Search aria-hidden="true" /><input aria-label="Search market" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={18} /></button>}</label>{query || favoritesOnly ? <div className="market-results"><h2>{favoritesOnly ? 'Your favorites' : 'Search results'}</h2>{results.length ? results.map(product => <Link to={`/market/product/${product.id}`} className="product-row" key={product.id}><span className="product-swatch" style={{ background: product.color }}>{product.name.slice(0, 1)}</span><div><h3>{product.name}</h3><p>{product.detail}</p><Money amount={product.price} /></div></Link>) : <EmptyState title={favoritesOnly ? 'No favorites yet' : 'No matches found'}>{favoritesOnly ? 'Open a product and tap its heart to save it here.' : 'Try Xbox, stc, eSIM or a category name.'}</EmptyState>}</div> : <div className="market-grid">{categories.map(category => <Link className="category-card" key={category.id} to={`/market/category/${category.id}`}><Artwork source="market" region={category.art} /><div><h2>{category.name}</h2><p>{category.description}</p></div></Link>)}</div>}</div></>;
}
