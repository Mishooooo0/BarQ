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
  generatedAt: string;
  summary: { today: number; week: number; month: number; avgDaily: number; balance: number; balanceDays: number | null };
  budgets: { daily: number; weekly: number; monthly: number };
  byCategory: CategoryTotal[];
  alerts: { type: 'overspend' | 'daily-limit'; category: CategoryId | null; amount: number; usual: number; message: string }[];
  subscriptions: { seller: string; category: CategoryId; amount: number; nextDue: string; daysLeft: number }[];
}
/** Written by Claude from the insights. */
export type AiSource = { source: 'claude' | 'ring'; fallbackReason: string | null };
export interface Advice extends AiSource { headline: string; tips: string[]; pose: Pose; }
/** A record in the Payments database. */
export interface Payment { id: string; name: string; price: number; category: string; categoryId: CategoryId; date: string; placeId: string; createdAt: string; }
export interface PlanItem { time: string; label: string; category: CategoryId; categoryName: string; estimate: number; place: PublicPlace | null; note: string | null; }
export interface DailyPlan extends AiSource { type: 'daily'; date: string; budget: number; items: PlanItem[]; total: number; remaining: number; usualDaily: number; message: string; pose: Pose; }
export interface HangoutPlan extends AiSource {
  type: 'hangout'; date: string; group: { id: string; name: string }; members: { id: string; name: string; ready: boolean }[]; pending: string[];
  perPersonBudget: number; groupSize: number; items: PlanItem[]; perPersonTotal: number; groupTotal: number; message: string; pose: Pose;
}
export type VoteChoice = 'split' | 'own' | 'pay';
/** A planned hangout and its "who pays?" vote. */
export interface Hangout {
  id: string; groupId: string; groupName: string; createdBy: string; createdByName: string; createdAt: string;
  items: { time: string; label: string; placeId: string; name: string; category: CategoryId; estimate: number }[];
  perPerson: number; billAmount: number; status: 'voting' | 'playing' | 'decided' | 'settled'; sessionId: string | null;
  members: { id: string; name: string; voted: boolean }[]; votes: Record<string, VoteChoice> | null; myVote: VoteChoice | null; voteCount: number;
  result: { outcome: 'volunteer' | 'game' | 'split' | 'own'; label: string; payer: string | null; payerName: string | null; players: { id: string; name: string }[] | null; tally: Record<VoteChoice, number> } | null;
  dues: { userId: string; name: string; amount: number; paid: boolean }[];
}
export interface GameSession {
  id: string; createdBy: string; players: string[]; billAmount: number; status: 'playing' | 'finished' | 'settled'; hangoutId?: string;
  rounds: { gameId: string; scores: Record<string, number> }[]; currentRound: number;
  result: { totals: Record<string, number>; payer: string; tied: string[] } | null;
}
