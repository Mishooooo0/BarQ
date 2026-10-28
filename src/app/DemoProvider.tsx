import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { account, transactions as initialTransactions, products } from '../data/mock';
import type { CardId, CartLine, Transaction } from '../types';

interface State { balance: number; transactions: Transaction[]; frozen: CardId[]; favorites: string[]; cart: CartLine[]; spins: number; cashback: number; joined: boolean; hidden: boolean; completedQuests: string[]; }
type Action = { type: 'money'; amount: number; title: string; kind: Transaction['kind'] } | { type: 'freeze'; id: CardId } | { type: 'favorite'; id: string } | { type: 'cart'; id: string; delta: number } | { type: 'checkout' } | { type: 'spin' } | { type: 'join' } | { type: 'hide' } | { type: 'quest'; id: string } | { type: 'reset' };
const initial: State = { balance: account.balance, transactions: initialTransactions, frozen: [], favorites: [], cart: [], spins: 1, cashback: account.cashback, joined: false, hidden: false, completedQuests: [] };
const toggle = <T,>(list: T[], id: T) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];
const cents = (value: number) => Math.round(value * 100) / 100;
function transaction(state: State, amount: number, title: string, kind: Transaction['kind']): State {
  return { ...state, balance: cents(state.balance + amount), transactions: [{ id: crypto.randomUUID(), title, amount, kind, subtitle: 'Simulated · No real money moved', date: 'Today' }, ...state.transactions] };
}
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'money': return Number.isFinite(action.amount) && state.balance + action.amount >= 0 ? transaction(state, action.amount, action.title, action.kind) : state;
    case 'freeze': return { ...state, frozen: toggle(state.frozen, action.id) };
    case 'favorite': return { ...state, favorites: toggle(state.favorites, action.id) };
    case 'cart': {
      const quantity = Math.min(9, Math.max(0, (state.cart.find(x => x.productId === action.id)?.quantity ?? 0) + action.delta));
      return { ...state, cart: [...state.cart.filter(x => x.productId !== action.id), ...(quantity ? [{ productId: action.id, quantity }] : [])] };
    }
    case 'checkout': {
      const total = state.cart.reduce((sum, line) => sum + (products.find(p => p.id === line.productId)?.price ?? 0) * line.quantity, 0);
      return total > 0 && total <= state.balance ? { ...transaction(state, -total, 'Market demo order', 'shopping'), cart: [] } : state;
    }
    case 'spin': return state.spins ? { ...transaction(state, 5, 'Spin the Wheel reward', 'cashback'), spins: 0, cashback: cents(state.cashback + 5) } : state;
    case 'join': return { ...state, joined: true };
    case 'hide': return { ...state, hidden: !state.hidden };
    case 'quest': return { ...state, completedQuests: state.completedQuests.includes(action.id) ? state.completedQuests : [...state.completedQuests, action.id] };
    case 'reset': return { ...initial };
  }
}
const DemoContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <DemoContext.Provider value={{ state, dispatch }}>{children}</DemoContext.Provider>;
}
export function useDemo() { const context = useContext(DemoContext); if (!context) throw new Error('DemoProvider is required'); return context; }
