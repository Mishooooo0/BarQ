// Shapes returned by the BarQ API (server/api.mjs).
export type CategoryId = 'food' | 'cafe' | 'health' | 'shopping' | 'groceries' | 'transportation' | 'entertainment';
export interface User { id: string; name: string; balance: number; savings: number; cashback: number; hangoutBudget: number | null; }
export interface DirectoryEntry { id: string; name: string; }
export interface ServerTransaction { id: string; date: string; seller: string; category: CategoryId | null; amount: number; kind: 'purchase' | 'transfer' | 'topup' | 'cashback' | 'savings'; note?: string; }
export interface CategoryTemplate { id: CategoryId; name: string; nameAr: string; source: string; defaultCost: number; count: number; }
export interface PlaceRecord { record_id: string; name: string; categoryId: CategoryId; general_category: string; address: string; rating5: number | null; price_category_ar: string | null; estimatedCost: number; }
export interface PublicPlace { id: string; name: string; categoryId: CategoryId; address: string; district: string | null; rating: number | null; priceLabel: string | null; estimatedCost: number; }
export interface Group { id: string; name: string; members: (DirectoryEntry & { ready: boolean })[]; }
export type Pose = 'hero' | 'thumbs' | 'think' | 'idea' | 'celebrate' | 'coin' | 'laptop' | 'receipt' | 'places' | 'growth' | 'ok';
export interface CategoryTotal { id: CategoryId; name: string; amount: number; count: number; }
export interface Insights {
  generatedAt: string;
  summary: { today: number; week: number; month: number; avgDaily: number; balance: number; balanceDays: number | null };
  budgets: { daily: number; weekly: number; monthly: number };
  byCategory: CategoryTotal[];
  alerts: { type: 'overspend' | 'daily-limit'; category: CategoryId | null; amount: number; usual: number; message: string }[];
  subscriptions: { seller: string; category: CategoryId; amount: number; nextDue: string; daysLeft: number }[];
}
/** Written by the AI (shown to users as Barq) from the insights. */
export type AiSource = { source: 'claude' | 'ring' | 'standard'; fallbackReason: string | null };
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
export interface PlacePoll {
  id: string; groupId: string; createdBy: string; createdAt: string; members: string[];
  options: { placeId: string; name: string; estimate: number; time: string; label: string; votes: number }[];
  votes: Record<string, string>; myVote: string | null; status: 'voting' | 'decided'; winnerId: string | null;
}
/** A planned hangout and its "who pays?" vote. */
export interface Hangout {
  id: string; groupId: string; groupName: string; createdBy: string; createdByName: string; createdAt: string;
  items: { time: string; label: string; placeId: string; name: string; category: CategoryId; estimate: number }[];
  perPerson: number; billAmount: number; status: 'voting' | 'playing' | 'decided' | 'settled' | 'canceled'; sessionId: string | null;
  /** When everyone who owed has paid; ended hangouts move to History. */
  endedAt: string | null;
  /** While voting: when the 2 minutes run out, and how many seconds were left when the server answered. */
  expiresAt: string | null; secondsLeft: number | null;
  members: { id: string; name: string; voted: boolean }[]; votes: Record<string, VoteChoice> | null; myVote: VoteChoice | null; voteCount: number;
  result: { outcome: 'volunteer' | 'game' | 'split' | 'own'; label: string; payer: string | null; payerName: string | null; players: { id: string; name: string }[] | null; tally: Record<VoteChoice, number> } | null;
  dues: { userId: string; name: string; amount: number; paid: boolean }[];
}
/** A game in the Games database; `engine` is its key in the Points Challenges page. */
export interface Game { id: string; name: string; nameAr: string; engine: string; path: string; status: 'active' | 'inactive'; description: string; }
export interface GameSession {
  id: string; createdBy: string; players: string[]; billAmount: number; status: 'playing' | 'finished' | 'settled'; hangoutId?: string;
  rounds: { gameId: string; scores: Record<string, number> }[]; currentRound: number;
  result: { totals: Record<string, number>; payer: string; tied: string[] } | null;
}

export type OccasionTypeId = 'eid-fitr' | 'eid-adha' | 'graduation' | 'home-party' | 'holiday';
export interface OccasionType { id: OccasionTypeId; name: string; eidia: boolean; expectedDate: string | null; lines: string[]; }
export interface OccasionLine { id: string; label: string; amount: number; done: boolean; }
export interface EidiaEntry { id: string; name: string; amount: number; given: boolean; }
/** An Eid, graduation, party or holiday budget (server/occasions.mjs). */
export interface Occasion {
  id: string; type: OccasionTypeId; typeName: string; hasEidia: boolean; title: string; date: string; budget: number;
  lines: OccasionLine[]; eidia: EidiaEntry[]; createdAt: string; updatedAt: string;
  totals: { lines: number; eidia: number; planned: number; left: number; over: boolean; done: number };
  daysLeft: number; past: boolean; perWeek: number;
  /** What is still to buy or give, spread over the days, weeks and months left. */
  saving: SavingPlan;
}
export interface SavingPlan { amount: number; days: number; weeks: number; months: number; perDay: number; perWeek: number; perMonth: number; }
export interface OccasionPlan extends AiSource { message: string; pose: Pose; lines: { label: string; amount: number; note: string | null }[]; tips: string[]; saving: SavingPlan & { tip: string }; total: number; available: number; }
/** The Saving box and its end-of-year goal (server/savings.mjs). */
export interface Savings {
  saved: number; target: number | null; deadline: string; daysLeft: number; remaining: number | null;
  progress: number; reached: boolean; perWeek: number; perDay: number; setAt: string | null; history: ServerTransaction[];
}
