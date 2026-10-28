// Static catalog data for screens that are not backed by the API yet (cards artwork, Market products).
// Accounts, balances and transactions come from the Users database through the API.
import type { Category, PaymentCard, Product } from '../../types';

export const cards: PaymentCard[] = [
  { id: 'national', name: 'National Day 96 Card', last4: '1042', color: '#1f4b31' },
  { id: 'mada', name: 'mada Card', last4: '2086', color: '#367f85' },
  { id: 'barq', name: 'barq card', last4: '3017', color: '#df4655' },
];
export const categories: Category[] = [
  { id: 'gaming', name: 'Gaming', description: 'Playstation,\nXbox, PUBG and\nmore', art: [90, 585, 312, 255] },
  { id: 'vouchers', name: 'Vouchers', description: 'Apple, Google,\nAmazon,\nNamshi\nand more', art: [447, 585, 312, 255] },
  { id: 'airtime', name: 'Airtime', description: 'International\nand local\nrecharge cards', art: [805, 585, 312, 255] },
  { id: 'esim', name: 'eSIM', description: 'One eSIM card\nfor Global\ncoverage', art: [90, 1137, 312, 255] },
  { id: 'electronics', name: 'Electronics', description: 'Phone, Laptop,\nSmartwatch &\nmore', art: [447, 1137, 312, 255] },
  { id: 'bills', name: 'Bills', description: 'Pay your bills in\none place', art: [805, 1137, 312, 255] },
];
export const products: Product[] = [
  { id: 'ps', category: 'gaming', name: 'PlayStation gift card', detail: 'Saudi store · SAR 100 credit', price: 100, color: '#174a9b' },
  { id: 'xbox', category: 'gaming', name: 'Xbox gift card', detail: 'SAR 50 gaming credit', price: 50, color: '#4c951e' },
  { id: 'pubg', category: 'gaming', name: 'PUBG Mobile', detail: '325 UC voucher', price: 25, color: '#ba7c25' },
  { id: 'amazon', category: 'vouchers', name: 'Amazon gift card', detail: 'SAR 100 shopping credit', price: 100, color: '#252a30' },
  { id: 'noon', category: 'vouchers', name: 'noon gift card', detail: 'SAR 50 shopping credit', price: 50, color: '#f4d941' },
  { id: 'stc', category: 'airtime', name: 'stc recharge', detail: 'Prepaid recharge', price: 115, color: '#543395' },
  { id: 'mobily', category: 'airtime', name: 'Mobily recharge', detail: 'Prepaid recharge', price: 57.5, color: '#489ed1' },
  { id: 'global', category: 'esim', name: 'Global eSIM', detail: '3 GB · 7 days', price: 45, color: '#e0ca50' },
  { id: 'watch', category: 'electronics', name: 'Smartwatch', detail: 'Midnight', price: 899, color: '#343a49' },
  { id: 'buds', category: 'electronics', name: 'Wireless earbuds', detail: 'White', price: 249, color: '#b9bdc2' },
  { id: 'electricity', category: 'bills', name: 'Electricity bill', detail: 'Household · October', price: 186.5, color: '#7db8c8' },
];
