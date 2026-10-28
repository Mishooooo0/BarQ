import { Bell, ChartNoAxesColumnIncreasing, ChevronDown, ChevronUp, CircleUserRound, Eye, EyeOff, List, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { HomePromotion } from './HomePromotion';
import { useWallet } from '../../app/WalletProvider';
import { AnalystSprite } from '../Analyst/AnalystSprite';
import { BrandMark, Riyal } from '../../components/ui/Brand';
import { IconButton, Money } from '../../components/ui/Primitives';
import { ServiceTile, services } from '../../components/cards/ServiceTile';
import { useSheet } from '../../hooks/useSheet';
import type { Pose } from '../../types/api';

// Barq's features, as a 2 × 2 grid under the balance.
const features: { to: string; pose: Pose; title: string; text: string }[] = [
  { to: '/analyst', pose: 'laptop', title: 'AI Analyst', text: 'Your spending and a plan for today' },
  { to: '/hangouts', pose: 'places', title: 'Hangouts', text: 'Plan with friends and vote on who pays' },
  { to: '/occasions', pose: 'celebrate', title: 'Occasions', text: 'Eid, Eidia, graduations and parties' },
  { to: '/savings', pose: 'coin', title: 'Saving box', text: 'Save toward your year-end goal' },
];

export function Home() {
  const { state, dispatch, user } = useWallet(); const { open } = useSheet();
  const [whole, fraction] = state.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split('.');
  return <><section className="home-hero"><header className="home-header"><button className="profile-logo" aria-label="Profile" onClick={() => open('account')}><BrandMark /></button><button className="account-selector" onClick={() => open('account-switch')}><strong>{user.name.toUpperCase()}</strong><span>individual account <ChevronDown size={13} /></span></button><IconButton label="Notifications" className="glass" onClick={() => open('notifications')}><Bell fill="white" size={19} /></IconButton><IconButton label="Statistics" className="glass" onClick={() => open('statistics')}><ChartNoAxesColumnIncreasing fill="white" size={20} /></IconButton></header><div className="balance-block"><div className="balance-line"><div className="balance-value" aria-label={state.hidden ? 'Balance hidden' : `Available balance ${state.balance.toFixed(2)} Saudi riyals`}><Riyal /> {state.hidden ? <span className="hidden-balance">••••</span> : <><span>{whole}</span><small>.{fraction}</small></>}</div><IconButton label={state.hidden ? 'Show balance' : 'Hide balance'} className="glass balance-toggle" onClick={() => dispatch({ type: 'hide' })}>{state.hidden ? <EyeOff /> : <Eye />}</IconButton></div><p>Available balance</p></div><div className="home-actions"><button onClick={() => open('add-money')}><span className="action-circle"><Plus /></span><span>Add money</span></button><Link to="/transactions"><span className="action-circle"><List /></span><span>Transactions</span></Link><button onClick={() => open('account')}><span className="action-circle"><CircleUserRound /></span><span>Account</span></button></div></section><Link className="savings-strip" to="/savings"><ChevronUp size={16} /><span>Saving box · {state.hidden ? '••••' : <Money amount={state.savings} />}</span></Link><section className="home-content"><div className="section-heading"><h2>Explore with Barq</h2></div><div className="feature-grid">{features.map(f => <Link key={f.to} className="feature-tile" to={f.to}><AnalystSprite pose={f.pose} /><strong>{f.title}</strong><span>{f.text}</span></Link>)}</div><div className="section-heading"><h2>Services</h2><Link to="/more">View all</Link></div><div className="services-grid">{services.filter(service => service.id !== 'request-money').map(service => <ServiceTile key={service.id} service={service} />)}</div><h2 className="latest-title">Latest</h2><HomePromotion /></section></>;
}
