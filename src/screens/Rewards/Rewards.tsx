import { ChevronRight, CircleHelp } from 'lucide-react';
import { Link } from 'react-router';
import { Artwork } from '../../components/ui/Artwork';
import { IconButton, Money, PageHeader } from '../../components/ui/Primitives';
import { useSheet } from '../../hooks/useSheet';
import { useWallet } from '../../app/WalletProvider';

export function Rewards() {
  const { open } = useSheet(); const { state } = useWallet();
  return <><PageHeader title="Rewards"><IconButton label="Rewards help" className="cream" onClick={() => open('help')}><CircleHelp strokeWidth={3.2} /></IconButton></PageHeader><div className="rewards-content"><div className="cashback-summary"><Artwork source="rewards" region={[73, 260, 50, 57]} className="cashbag" /><div><Money amount={state.cashback} /><p>Total received cashback</p></div></div><div className="reward-links"><Link to="/rewards/wheel" className="reward-row"><Artwork source="rewards" region={[53, 388, 161, 162]} /><div><h2>Spin the Wheel</h2><p>Tap to view the available spins</p></div><ChevronRight /></Link><Link to="/rewards/quests" className="reward-row"><Artwork source="rewards" region={[53, 592, 161, 162]} /><div><h2>Quests</h2><p>Tap to view the<br /> available quests</p></div><ChevronRight /></Link></div><Link to="/rewards/marathon" className="marathon-card"><h2>barq<br />Marathon</h2><p>VIP/Exclusive Experienc...</p><Artwork source="rewards" region={[147, 976, 99, 87]} className="marathon-art" /><span>Ends in 23h 19m</span></Link></div></>;
}
