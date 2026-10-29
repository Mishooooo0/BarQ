import { ChevronRight, CircleHelp } from 'lucide-react';
import { Link } from 'react-router';
import { Artwork } from '../../components/ui/Artwork';
import { IconButton, Money, PageHeader } from '../../components/ui/Primitives';
import { useSheet } from '../../hooks/useSheet';
import { useWallet } from '../../app/WalletProvider';
import { t } from '../../i18n';

export function Rewards() {
  const { open } = useSheet(); const { state } = useWallet();
  return <><PageHeader title={t('Rewards')}><IconButton label={t('Rewards help')} className="cream" onClick={() => open('help')}><CircleHelp strokeWidth={3.2} /></IconButton></PageHeader><div className="rewards-content"><div className="cashback-summary"><Artwork source="rewards" region={[73, 260, 50, 57]} className="cashbag" /><div><Money amount={state.cashback} /><p>{t('Total received cashback')}</p></div></div><div className="reward-links"><Link to="/rewards/wheel" className="reward-row"><Artwork source="rewards" region={[53, 388, 161, 162]} /><div><h2>{t('Spin the Wheel')}</h2><p>{t('Tap to view the available spins')}</p></div><ChevronRight /></Link><Link to="/rewards/quests" className="reward-row"><Artwork source="rewards" region={[53, 592, 161, 162]} /><div><h2>{t('Quests')}</h2><p>{t('Tap to view the available quests')}</p></div><ChevronRight /></Link></div><Link to="/rewards/marathon" className="marathon-card"><h2>{t('barq Marathon')}</h2><p>{t('VIP/Exclusive Experiences')}</p><Artwork source="rewards" region={[147, 976, 99, 87]} className="marathon-art" /><span>{t('Ends in {hours}h {minutes}m', { hours: 23, minutes: 19 })}</span></Link></div></>;
}
