import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, currentToken, errorMessage, onSessionExpired, setToken } from '../lib/api';
import type { User } from '../types/api';
import { t } from '../i18n';

type Status = 'checking' | 'signed-out' | 'signed-in' | 'unreachable';
interface Session {
  status: Status; user: User | null; notice: string;
  signIn: (userId: string, pin: string) => Promise<void>; signOut: () => void; retry: () => void; setUser: (user: User) => void;
}
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(() => currentToken() ? 'checking' : 'signed-out');
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!currentToken()) return;
    const controller = new AbortController();
    setStatus('checking');
    api<User>('/api/me', { signal: controller.signal })
      .then(me => { setUser(me); setStatus('signed-in'); setNotice(''); })
      .catch(error => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) { setToken(null); setStatus('signed-out'); }
        else { setNotice(errorMessage(error)); setStatus('unreachable'); }
      });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => onSessionExpired(() => { setToken(null); setUser(null); setNotice(t('Your session ended. Please sign in again.')); setStatus('signed-out'); }), []);

  const signIn = useCallback(async (userId: string, pin: string) => {
    const result = await api<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: { userId, pin } });
    setToken(result.token); setUser(result.user); setNotice(''); setStatus('signed-in');
  }, []);
  const signOut = useCallback(() => { setToken(null); setUser(null); setNotice(''); setStatus('signed-out'); }, []);
  const retry = useCallback(() => setAttempt(n => n + 1), []);
  const value = useMemo(() => ({ status, user, notice, signIn, signOut, retry, setUser }), [status, user, notice, signIn, signOut, retry]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('SessionProvider is required');
  return context;
}
/** The signed-in user. Only use below the signed-in gate in App. */
export function useUser() {
  const { user } = useSession();
  if (!user) throw new Error('No signed-in user');
  return user;
}
