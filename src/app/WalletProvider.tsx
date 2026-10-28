import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { products } from '../data/mock';
import { toTransaction } from '../lib/format';
import { useSession, useUser } from './SessionProvider';
import type { CardId, CartLine, Transaction } from '../types';
import type { CategoryId, DirectoryEntry, ServerTransaction, User } from '../types/api';

// Balance, cashback and transactions live in the Users database. Cards, favorites, cart and rewards progress are
// UI-only and reset when the account changes.
interface LocalState { frozen: CardId[]; favorites: string[]; cart: CartLine[]; spins: number; joined: boolean; hidden: boolean; completedQuests: string[]; }
type Action = { type: 'freeze'; id: CardId } | { type: 'favorite'; id: string } | { type: 'cart'; id: string; delta: number } | { type: 'clear-cart' } | { type: 'use-spin' } | { type: 'join' } | { type: 'hide' } | { type: 'quest'; id: string };
const initial: LocalState = { frozen: [], favorites: [], cart: [], spins: 1, joined: false, hidden: false, completedQuests: [] };
const toggle = <T,>(list: T[], id: T) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];
function reducer(state: LocalState, action: Action): LocalState {
  switch (action.type) {
    case 'freeze': return { ...state, frozen: toggle(state.frozen, action.id) };
    case 'favorite': return { ...state, favorites: toggle(state.favorites, action.id) };
    case 'cart': {
      const quantity = Math.min(9, Math.max(0, (state.cart.find(x => x.productId === action.id)?.quantity ?? 0) + action.delta));
      return { ...state, cart: [...state.cart.filter(x => x.productId !== action.id), ...(quantity ? [{ productId: action.id, quantity }] : [])] };
    }
    case 'clear-cart': return { ...state, cart: [] };
    case 'use-spin': return { ...state, spins: Math.max(0, state.spins - 1) };
    case 'join': return { ...state, joined: true };
    case 'hide': return { ...state, hidden: !state.hidden };
    case 'quest': return { ...state, completedQuests: state.completedQuests.includes(action.id) ? state.completedQuests : [...state.completedQuests, action.id] };
  }
}

export type TransferChannel = 'wallet' | 'local' | 'international';
interface Wallet {
  state: LocalState & { balance: number; cashback: number; savings: number; transactions: Transaction[] };
  dispatch: React.Dispatch<Action>;
  user: User; directory: DirectoryEntry[]; history: { loading: boolean; error: string | null };
  refresh: () => Promise<void>;
  topUp: (amount: number) => Promise<void>;
  purchase: (amount: number, seller: string, category?: CategoryId | null) => Promise<void>;
  cashbackReward: (amount: number, seller: string) => Promise<void>;
  transfer: (to: string, amount: number, channel: TransferChannel) => Promise<void>;
  checkout: () => Promise<void>;
}
const WalletContext = createContext<Wallet | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const user = useUser(); const { setUser } = useSession();
  const [local, dispatch] = useReducer(reducer, initial);
  const [transactions, setTransactions] = useState<ServerTransaction[]>([]);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [history, setHistory] = useState<{ loading: boolean; error: string | null }>({ loading: true, error: null });

  const refresh = useCallback(async () => {
    setHistory(h => ({ ...h, loading: true }));
    try {
      const [me, list] = await Promise.all([api<User>('/api/me'), api<{ items: ServerTransaction[] }>('/api/me/transactions')]);
      setUser(me); setTransactions(list.items); setHistory({ loading: false, error: null });
    } catch (error) {
      setHistory({ loading: false, error: error instanceof Error ? error.message : 'Could not load your activity.' });
    }
  }, [setUser]);

  useEffect(() => { void refresh(); api<DirectoryEntry[]>('/api/users').then(setDirectory).catch(() => setDirectory([])); }, [refresh]);

  const apply = useCallback((result: { user: User; transaction: ServerTransaction }) => {
    setUser(result.user); setTransactions(list => [result.transaction, ...list]);
  }, [setUser]);
  const post = useCallback(async (body: object) => apply(await api('/api/me/transactions', { method: 'POST', body })), [apply]);

  const value = useMemo<Wallet>(() => ({
    state: { ...local, balance: user.balance, cashback: user.cashback, savings: user.savings, transactions: transactions.map(toTransaction) },
    dispatch, user, directory: directory.filter(entry => entry.id !== user.id), history, refresh,
    topUp: amount => post({ kind: 'topup', amount, seller: 'Wallet top-up' }),
    purchase: (amount, seller, category = null) => post({ kind: 'purchase', amount, seller, category }),
    cashbackReward: (amount, seller) => post({ kind: 'cashback', amount, seller }),
    transfer: async (to, amount, channel) => apply(await api('/api/transfers', { method: 'POST', body: { to, amount, channel } })),
    checkout: async () => {
      const total = Math.round(local.cart.reduce((sum, line) => sum + (products.find(p => p.id === line.productId)?.price ?? 0) * line.quantity, 0) * 100) / 100;
      if (total <= 0) return;
      await post({ kind: 'purchase', amount: total, seller: 'barq Market order', category: 'shopping' });
      dispatch({ type: 'clear-cart' });
    },
  }), [local, user, transactions, directory, history, refresh, post, apply]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() { const context = useContext(WalletContext); if (!context) throw new Error('WalletProvider is required'); return context; }
