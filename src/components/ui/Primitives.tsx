import { ArrowLeft, Navigation, Signal } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Riyal } from './Brand';

export function IconButton({ label, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} {...props}>{children}</button>;
}
export function StatusBar() {
  return <div className="status-bar" aria-hidden="true"><span className="status-time">12:10 <Navigation size={15} fill="currentColor" strokeWidth={3} /></span><span className="status-connection"><Signal size={22} strokeWidth={3.5} /><b>5G</b><span className="battery">42</span></span></div>;
}
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) { return <header className="page-header"><h1>{title}</h1><div className="header-actions">{children}</div></header>; }
export function DetailHeader({ title, fallback, children }: { title: string; fallback: string; children?: ReactNode }) {
  const navigate = useNavigate();
  return <header className="detail-header"><IconButton label="Go back" className="light" onClick={() => window.history.state?.idx > 0 ? navigate(-1) : navigate(fallback)}><ArrowLeft /></IconButton><h1>{title}</h1>{children}</header>;
}
export function Money({ amount, className = '' }: { amount: number; className?: string }) { return <span className={`money ${className}`}><Riyal /> {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>; }
export function MockNote() { return <p className="mock-note">Prototype · Mock accounts · No real money moves</p>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="error-state" role="alert"><p>{message}</p>{onRetry && <button type="button" className="secondary-button" onClick={onRetry}>Try again</button>}</div>;
}
export function EmptyState({ title, children }: { title: string; children: ReactNode }) { return <div className="empty-state"><h2>{title}</h2><p>{children}</p></div>; }
