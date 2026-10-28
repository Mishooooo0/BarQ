import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { Link, Route, Routes, useLocation } from 'react-router';
import { StatusBar } from '../components/ui/Primitives';
import { BottomNav } from '../components/navigation/BottomNav';
import { DemoSheet } from '../components/modals/DemoSheet';
import { Home } from '../screens/Home/Home';
import { Rewards } from '../screens/Rewards/Rewards';
import { Cards } from '../screens/Cards/Cards';
import { Market } from '../screens/Market/Market';
import { More } from '../screens/More/More';
import { CardDetail, RewardDetail, Transactions } from '../screens/Detail/Details';
import { CategoryDetail, ProductDetail, Cart } from '../screens/Detail/MarketDetails';
import { PointsGames } from '../screens/Games/PointsGames';

export function App() {
  const location = useLocation(); const scroll = useRef<HTMLDivElement>(null); const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const isHome = location.pathname === '/'; const isRewards = location.pathname === '/rewards';
  useEffect(() => { scroll.current?.scrollTo(0, 0); }, [location.pathname]);
  return <MotionConfig reducedMotion="user"><div className="desktop-caption"><strong>barq</strong><span>Independent interface prototype</span><span className="demo-chip">UNOFFICIAL DEMO</span></div><div className={`phone ${isHome ? 'home-phone' : ''} ${isRewards ? 'rewards-phone' : ''} ${location.pathname === '/more' ? 'more-phone' : ''} ${location.pathname === '/points-games' ? 'games-phone' : ''} ${scrolled ? 'is-scrolled' : ''}`}><div className="screen-scroll" ref={scroll} onScroll={e => setScrolled(e.currentTarget.scrollTop > 150)}><StatusBar /><AnimatePresence mode="wait" initial={false}><motion.main key={location.pathname} initial={{ opacity: 0, y: reduced ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .13 }}><Routes location={location}><Route path="/" element={<Home />} /><Route path="/rewards" element={<Rewards />} /><Route path="/rewards/:id" element={<RewardDetail />} /><Route path="/cards" element={<Cards />} /><Route path="/cards/:id" element={<CardDetail />} /><Route path="/market" element={<Market />} /><Route path="/market/category/:id" element={<CategoryDetail />} /><Route path="/market/product/:id" element={<ProductDetail />} /><Route path="/market/cart" element={<Cart />} /><Route path="/more" element={<More />} /><Route path="/points-games" element={<PointsGames />} /><Route path="/transactions" element={<Transactions />} /><Route path="*" element={<div className="detail-content"><h1>Page not found</h1><Link className="primary-button" to="/">Back to Home</Link></div>} /></Routes></motion.main></AnimatePresence></div><BottomNav /><DemoSheet /></div><p className="desktop-footnote">Fictional balances and accounts. No affiliation with barq.</p></MotionConfig>;
}
