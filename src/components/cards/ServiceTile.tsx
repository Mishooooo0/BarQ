import { CornerRightDown, Globe, Landmark } from 'lucide-react';
import { BrandMark } from '../ui/Brand';
import { Artwork } from '../ui/Artwork';
import { useSheet } from '../../hooks/useSheet';
import type { SheetName } from '../../types';
import { t } from '../../i18n';

export const services: { id: SheetName; label: () => string; icon: typeof Globe | null }[] = [
  { id: 'transfer-wallet', label: () => t('Transfer to barq wallet'), icon: null },
  { id: 'request-money', label: () => t('Money Requests'), icon: CornerRightDown },
  { id: 'international', label: () => t('International Transfer'), icon: Globe },
  { id: 'local-bank', label: () => t('Local Bank Transfer'), icon: Landmark },
];
export function ServiceTile({ service }: { service: typeof services[number] }) {
  const { open } = useSheet(); const Icon = service.icon;
  return <button className="service-tile" onClick={() => open(service.id)}><span className="service-icon">{Icon ? <Icon strokeWidth={1.7} /> : <BrandMark />}</span><span>{service.label()}</span></button>;
}
export function AccountTile() { const { open } = useSheet(); return <button className="service-tile" onClick={() => open('new-account')}><Artwork source="productsLower" region={[89, 370, 61, 61]} className="service-reference-icon" /><span>{t('Youth Accounts')}</span></button>; }
