import { Headset, MapPin, Users } from 'lucide-react';
import { IconButton, PageHeader } from '../../components/ui/Primitives';
import { Artwork } from '../../components/ui/Artwork';
import { AccountTile, ServiceTile, services } from '../../components/cards/ServiceTile';
import { useSheet } from '../../hooks/useSheet';
import { Link } from 'react-router';
import mascot from '../../assets/mascot-encouraging.png';
import { AnalystSprite } from '../Analyst/AnalystSprite';

function PlayingCards() { return <svg viewBox="0 0 32 36" fill="none" aria-hidden="true"><rect x="8" y="5" width="21" height="28" rx="3" stroke="currentColor" strokeWidth="1.8" /><rect x="4" y="2" width="21" height="30" rx="3" fill="#f7f7f7" stroke="currentColor" strokeWidth="1.8" /><path d="M14.5 14c-4-5-9 1 0 8 9-7 4-13 0-8" fill="currentColor" /><path d="M8 7c-2-2-4 1 0 4 4-3 2-6 0-4M20 26c-2-2-4 1 0 4 4-3 2-6 0-4" fill="currentColor" /></svg>; }
export function More() {
  const { open } = useSheet();
  return <>
    <PageHeader title="Products"><IconButton label="Customer support" onClick={() => open('support')}><Headset /></IconButton></PageHeader>
    <div className="products-content">
      <section><h2 className="section-title">Explore</h2><div className="services-grid"><Link className="service-tile" to="/analyst"><span className="service-icon mascot-icon analyst-icon"><AnalystSprite pose="thumbs" /></span><span>AI Analyst</span><span className="beta">New</span></Link><Link className="service-tile" to="/hangouts"><span className="service-icon"><Users strokeWidth={1.7} /></span><span>Hangouts</span><span className="beta">New</span></Link><Link className="service-tile" to="/places"><span className="service-icon"><MapPin strokeWidth={1.7} /></span><span>Riyadh places</span></Link></div></section>
      <section><h2 className="section-title">Transfers</h2><div className="services-grid">{services.map(service => <ServiceTile key={service.id} service={service} />)}</div></section>
      <section><h2 className="section-title">Games</h2><div className="services-grid"><button className="service-tile game-tile" onClick={() => open('baloot')}><span className="service-icon neutral"><PlayingCards /></span><span>Baloot</span><span className="beta">Beta</span></button><Link className="service-tile game-tile" to="/points-games"><span className="service-icon mascot-icon"><img src={mascot} alt="" /></span><span>Points Challenges</span><span className="beta">New</span></Link></div></section>
      <section><h2 className="section-title">Accounts</h2><div className="services-grid"><AccountTile /></div></section>
      <section><h2 className="section-title">Payments</h2><div className="services-grid"><button className="service-tile" onClick={() => open('salary')}><Artwork source="productsLower" region={[89, 666, 61, 62]} className="service-reference-icon" /><span>Domestic<br />Labor Salaries</span></button></div></section>
      <section><h2 className="section-title">Rewards &amp; Offers</h2><div className="services-grid"><button className="service-tile offers-tile" onClick={() => open('offers')}><Artwork source="productsLower" region={[89, 971, 61, 62]} className="service-reference-icon" /><span>Offers</span></button></div></section>
    </div>
  </>;
}
