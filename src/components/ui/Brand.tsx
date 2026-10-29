import type { SVGProps } from 'react';
import mark from '../../assets/barq-mark.json';
import riyal from '../../assets/riyal-mark.json';
import { t } from '../../i18n';
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox={mark.viewBox} fill="currentColor" aria-hidden="true" {...props} className={`brand-mark ${props.className ?? ''}`}><path d={mark.path} fillRule="evenodd" /></svg>;
}
export function RewardIcon({ active = false }: { active?: boolean }) {
  return <svg viewBox="0 0 30 30" fill="none" aria-hidden="true"><circle cx="15" cy="15" r="13" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" /><path d={mark.path} transform="translate(11 8.8) scale(.2)" fill={active ? 'white' : 'currentColor'} fillRule="evenodd" /></svg>;
}
export function Riyal({ className = '' }: { className?: string }) {
  return <svg className={`riyal ${className}`} viewBox={riyal.viewBox} fill="currentColor" role="img" aria-label={t('Saudi riyals')}><path d={riyal.path} fillRule="evenodd" /></svg>;
}
