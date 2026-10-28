import { Bell, ChartNoAxesColumnIncreasing, ChevronDown, ChevronUp, CircleUserRound, Eye, EyeOff, List, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { HomePromotion } from './HomePromotion';
import { account } from '../../data/mock';
import { useDemo } from '../../app/DemoProvider';
import { BrandMark, Riyal } from '../../components/ui/Brand';
import { IconButton } from '../../components/ui/Primitives';
import { ServiceTile, services } from '../../components/cards/ServiceTile';
import { useSheet } from '../../hooks/useSheet';

export function Home() {
  const { state, dispatch } = useDemo(); const { open } = useSheet();
  const [whole, fraction] = state.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split('.');
  return <><section className="home-hero"><header className="home-header"><button className="profile-logo" aria-label="Profile" onClick={() => open('account')}><BrandMark /></button><button className="account-selector" onClick={() => open('account-switch')}><strong>{account.name}</strong><span>{account.type} <ChevronDown size={13} /></span></button><IconButton label="Notifications" className="glass" onClick={() => open('notifications')}><Bell fill="white" size={19} /></IconButton><IconButton label="Statistics" className="glass" onClick={() => open('statistics')}><ChartNoAxesColumnIncreasing fill="white" size={20} /></IconButton></header><div className="balance-block"><div className="balance-line"><div className="balance-value" aria-label={state.hidden ? 'Balance hidden' : `Available balance ${state.balance.toFixed(2)} Saudi riyals`}><Riyal /> {state.hidden ? <span className="hidden-balance">••••</span> : <><span>{whole}</span><small>.{fraction}</small></>}</div><IconButton label={state.hidden ? 'Show balance' : 'Hide balance'} className="glass balance-toggle" onClick={() => dispatch({ type: 'hide' })}>{state.hidden ? <EyeOff /> : <Eye />}</IconButton></div><p>Available balance</p></div><div className="home-actions"><button onClick={() => open('add-money')}><span className="action-circle"><Plus /></span><span>Add money</span></button><Link to="/transactions"><span className="action-circle"><List /></span><span>Transactions</span></Link><button onClick={() => open('account')}><span className="action-circle"><CircleUserRound /></span><span>Account</span></button></div></section><button className="savings-strip" onClick={() => open('savings')}><ChevronUp size={16} /><span>Your total savings</span></button><section className="home-content"><div className="section-heading"><h2>Services</h2><Link to="/more">View all</Link></div><div className="services-grid">{services.filter(service => service.id !== 'request-money').map(service => <ServiceTile key={service.id} service={service} />)}</div><h2 className="latest-title">Latest</h2><HomePromotion /></section></>;
}
