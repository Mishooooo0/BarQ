// Shapes returned by the BarQ API (server/api.mjs).
export type CategoryId = 'food' | 'cafe' | 'health' | 'shopping' | 'groceries' | 'transportation' | 'entertainment';
export interface User { id: string; name: string; balance: number; savings: number; cashback: number; hangoutBudget: number | null; }
export interface DirectoryEntry { id: string; name: string; }
export interface ServerTransaction { id: string; date: string; seller: string; category: CategoryId | null; amount: number; kind: 'purchase' | 'transfer' | 'topup' | 'cashback'; note?: string; }
export interface CategoryTemplate { id: CategoryId; name: string; nameAr: string; source: string; defaultCost: number; count: number; }
export interface PlaceRecord { record_id: string; name: string; categoryId: CategoryId; general_category: string; address: string; rating5: number | null; price_category_ar: string | null; estimatedCost: number; }
export interface PublicPlace { id: string; name: string; categoryId: CategoryId; address: string; district: string | null; rating: number | null; priceLabel: string | null; estimatedCost: number; }
export interface Group { id: string; name: string; members: (DirectoryEntry & { ready: boolean })[]; }
export type Pose = 'hero' | 'thumbs' | 'think' | 'idea' | 'celebrate' | 'coin' | 'laptop' | 'receipt' | 'places' | 'piggy' | 'growth';
export interface CategoryTotal { id: CategoryId; name: string; amount: number; count: number; }
export interface Insights {
  generatedAt: string; pose: Pose; headline: string;
  summary: { today: number; week: number; month: number; avgDaily: number; balance: number; balanceDays: number | null };
  budgets: { daily: number; weekly: number; monthly: number };
  byCategory: CategoryTotal[];
  alerts: { type: 'overspend' | 'daily-limit'; category: CategoryId | null; amount: number; usual: number; message: string }[];
  subscriptions: { seller: string; category: CategoryId; amount: number; nextDue: string; daysLeft: number }[];
  tips: string[];
}
export interface PlanItem { time: string; label: string; category: CategoryId; categoryName: string; estimate: number; place: PublicPlace | null; note: string | null; }
export interface DailyPlan { type: 'daily'; date: string; budget: number; items: PlanItem[]; total: number; remaining: number; usualDaily: number; message: string; pose: Pose; }
export interface HangoutPlan {
  type: 'hangout'; date: string; group: { id: string; name: string }; members: { id: string; name: string; ready: boolean }[]; pending: string[];
  perPersonBudget: number; groupSize: number; items: PlanItem[]; perPersonTotal: number; groupTotal: number; message: string; pose: Pose;
}
