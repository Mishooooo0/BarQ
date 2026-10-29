import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useSession } from '../../app/SessionProvider';
import { api, errorMessage } from '../../lib/api';
import { initials } from '../../lib/format';
import { ErrorState } from '../../components/ui/Primitives';
import { AnalystSprite } from '../Analyst/AnalystSprite';
import { LanguageToggle } from '../../components/LanguageToggle';
import { latinDigits, t } from '../../i18n';
import type { DirectoryEntry } from '../../types/api';

export function Login() {
  const { status, notice, signIn, retry } = useSession();
  const [accounts, setAccounts] = useState<DirectoryEntry[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<DirectoryEntry | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pinInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoadError('');
    api<DirectoryEntry[]>('/api/users').then(setAccounts).catch(e => setLoadError(errorMessage(e)));
  }, []);
  useEffect(() => { if (status === 'signed-out') load(); }, [status, load]);
  useEffect(() => { if (selected) pinInput.current?.focus(); }, [selected]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!selected || busy) return;
    if (!/^\d{4}$/.test(pin)) { setError(t('Enter your 4-digit PIN.')); return; }
    setBusy(true); setError('');
    try { await signIn(selected.id, pin); }
    catch (e) { setError(errorMessage(e)); setPin(''); pinInput.current?.focus(); }
    finally { setBusy(false); }
  };

  return <main className="login-screen">
    <div className="login-top"><LanguageToggle /></div>
    <div className="login-hero"><AnalystSprite pose="hero" className="login-sprite" /><h1>{t('barq')}</h1><p>{t('Sign in with your name and 4-digit PIN')}</p></div>
    {status === 'checking' ? <p className="login-status" role="status">{t('Signing you in…')}</p>
      : status === 'unreachable' ? <ErrorState message={notice} onRetry={retry} />
      : selected ? <form className="login-card" onSubmit={submit} noValidate>
        <button type="button" className="text-button login-back" onClick={() => { setSelected(null); setPin(''); setError(''); }}><ArrowLeft size={16} /> {t('All accounts')}</button>
        <div className="account-summary"><span className="avatar">{initials(selected.name)}</span><div><h3>{selected.name}</h3><p>{t('Individual account')}</p></div></div>
        <label className="field-label">{t('4-digit PIN')}<input ref={pinInput} className="pin-input" dir="ltr" type="password" inputMode="numeric" autoComplete="off" maxLength={4} pattern="\d{4}" value={pin} aria-invalid={!!error} aria-describedby={error ? 'pin-error' : undefined}
          onChange={e => { const next = latinDigits(e.target.value).replace(/\D/g, '').slice(0, 4); setPin(next); setError(''); }} /></label>
        {error && <p className="error-text" id="pin-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy}>{busy ? t('Signing in…') : t('Sign in')}</button>
      </form>
      : <section className="login-card" aria-label={t('Choose your account')}>
        {notice && <p className="error-text" role="alert">{notice}</p>}
        <h2 className="section-title">{t('Choose your account')}</h2>
        {loadError ? <ErrorState message={loadError} onRetry={load} /> : !accounts ? <p className="login-status" role="status">{t('Loading accounts…')}</p>
          : accounts.map(account => <button key={account.id} className="selection-row" onClick={() => setSelected(account)}><span className="avatar small" aria-hidden="true">{initials(account.name)}</span><span className="grow">{account.name}</span><ChevronRight size={18} /></button>)}
      </section>}
  </main>;
}
