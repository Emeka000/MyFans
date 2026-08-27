/**
 * Fan subscription domain types.
 *
 * These shapes are what the `/subscriptions` page renders. The data behind
 * them comes from the live API — see `@/lib/api/subscriptions` for the
 * active-list client and `src/app/subscriptions/page.tsx` for history and
 * payments. There are intentionally NO mock/sample exports here: the fan
 * subscriptions page must never render demo data in production
 * (MyFanss/MyFans#1590).
 */

export interface ActiveSubscription {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  planName: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  currentPeriodEnd: string; // ISO
  status: 'active';
}

export interface SubscriptionHistoryItem {
  id: string;
  creatorName: string;
  creatorUsername: string;
  planName: string;
  price: number;
  currency: string;
  startedAt: string;
  endedAt: string;
  cancelReason?: string;
}

export interface PaymentRecord {
  id: string;
  date: string; // ISO
  creatorName: string;
  planName: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  description?: string;
}
