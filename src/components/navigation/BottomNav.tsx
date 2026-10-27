import { CreditCard, Layers, ShoppingBag } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { RewardIcon } from '../ui/Brand';

function HomeIcon({ className, strokeWidth }: { className?: string; strokeWidth?: number }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={className} aria-hidden="true"><path strokeLinejoin="round" d="M3 9.5 12 2l9 7.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /></svg>; }
const tabs = [{ path: '/', label: 'Home', icon: HomeIcon }, { path: '/rewards', label: 'Rewards', icon: null }, { path: '/cards', label: 'Cards', icon: CreditCard }, { path: '/market', label: 'Market', icon: ShoppingBag }, { path: '/more', label: 'More', icon: Layers }];
export function BottomNav() {
  const location = useLocation();
  return <nav className={`bottom-nav ${location.pathname === '/' ? 'on-home' : ''}`} aria-label="Main navigation">{tabs.map(tab => <NavLink key={tab.path} to={tab.path} end={tab.path === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>{({ isActive }) => <><span className="nav-icon">{tab.icon ? <tab.icon strokeWidth={1.8} className={isActive ? 'selected-icon' : ''} /> : <RewardIcon active={isActive} />}</span><span>{tab.label}</span></>}</NavLink>)}</nav>;
}
