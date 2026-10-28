import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { StatusBar } from '../components/ui/Primitives';
import { BottomNav } from '../components/navigation/BottomNav';
import { AppSheet } from '../components/modals/AppSheet';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Home } from '../screens/Home/Home';
import { Rewards } from '../screens/Rewards/Rewards';
import { Cards } from '../screens/Cards/Cards';
import { Market } from '../screens/Market/Market';
import { More } from '../screens/More/More';
import { Places } from '../screens/Places/Places';
import { PointsGames } from '../screens/Games/PointsGames';
import { Analyst } from '../screens/Analyst/Analyst';
import { Login } from '../screens/Login/Login';
import { CardDetail, RewardDetail, Transactions } from '../screens/Detail/Details';
import { CategoryDetail, ProductDetail, Cart } from '../screens/Detail/MarketDetails';
import { useSession } from './SessionProvider';
import { WalletProvider } from './WalletProvider';

export function App() {
  const location = useLocation(); const scroll = useRef<HTMLDivElement>(null); const reduced = useReducedMotion();
  const { status, user } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const signedIn = status === 'signed-in' && !!user;
  const isHome = signedIn && location.pathname === '/'; const isRewards = location.pathname === '/rewards';
  useEffect(() => { scroll.current?.scrollTo(0, 0); }, [location.pathname, signedIn]);
  const frame = (content: ReactNode, chrome?: ReactNode) => <MotionConfig reducedMotion="user"><div className="desktop-caption"><strong>barq</strong><span>Independent interface prototype</span><span className="proto-chip">PROTOTYPE</span></div><div className={`phone ${isHome ? 'home-phone' : ''} ${signedIn && isRewards ? 'rewards-phone' : ''} ${signedIn && location.pathname === '/more' ? 'more-phone' : ''} ${signedIn && location.pathname === '/points-games' ? 'games-phone' : ''} ${signedIn && location.pathname === '/analyst' ? 'analyst-phone' : ''} ${scrolled ? 'is-scrolled' : ''}`}><div className="screen-scroll" ref={scroll} onScroll={e => setScrolled(e.currentTarget.scrollTop > 150)}><StatusBar />{content}</div>{chrome}</div><p className="desktop-footnote">Mock balances and accounts. No affiliation with barq.</p></MotionConfig>;
  if (!signedIn) return frame(<Login />);
  return <WalletProvider key={user.id}>{frame(
    <AnimatePresence mode="wait" initial={false}><motion.main key={location.pathname} initial={{ opacity: 0, y: reduced ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .13 }}><ErrorBoundary resetKey={location.pathname}><Routes location={location}><Route path="/" element={<Home />} /><Route path="/rewards" element={<Rewards />} /><Route path="/rewards/:id" element={<RewardDetail />} /><Route path="/cards" element={<Cards />} /><Route path="/cards/:id" element={<CardDetail />} /><Route path="/market" element={<Market />} /><Route path="/market/category/:id" element={<CategoryDetail />} /><Route path="/market/product/:id" element={<ProductDetail />} /><Route path="/market/cart" element={<Cart />} /><Route path="/more" element={<More />} /><Route path="/places" element={<Places />} /><Route path="/analyst" element={<Analyst />} /><Route path="/points-games" element={<PointsGames />} /><Route path="/transactions" element={<Transactions />} /><Route path="*" element={<div className="detail-content"><h1>Page not found</h1><Link className="primary-button" to="/">Back to Home</Link></div>} /></Routes></ErrorBoundary></motion.main></AnimatePresence>,
    <><BottomNav /><AppSheet /></>,
  )}</WalletProvider>;
}
