export type CardId = 'national' | 'mada' | 'barq';
export interface DemoCard { id: CardId; name: string; last4: string; color: string; }
export interface Transaction { id: string; title: string; subtitle: string; amount: number; date: string; kind: 'shopping' | 'transfer' | 'cashback' | 'topup'; }
export interface Category { id: string; name: string; description: string; art: [number, number, number, number]; }
export interface Product { id: string; category: string; name: string; detail: string; price: number; color: string; }
export interface CartLine { productId: string; quantity: number; }
export type SheetName = 'account' | 'account-switch' | 'notifications' | 'statistics' | 'savings' | 'add-money' | 'add-card' | 'help' | 'support' | 'transfer-wallet' | 'request-money' | 'international' | 'local-bank' | 'baloot' | 'new-account' | 'promotion' | 'categories' | 'salary' | 'offers';
