import { apiFetch, extractErrorMessage } from './client';

// Matches souplesse-api's SubscriptionPlan / Subscription Prisma models —
// only the fields the mobile UI actually uses.
export type ActivityCategory = 'FIT_DANCE' | 'TAEKWONDO' | 'BOXING';

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceSingle: number;
  /** null = solo only (souplesse-api refuses a couple request with `couple_not_available`). */
  priceCouple: number | null;
  /** null = no fixed validity (Séance unique). */
  validityDays: number | null;
  maxPauses: number;
  /** Credit-based formula (Séance unique, Carnets): sessions included; null = duration formula. */
  sessionCredits: number | null;
  /** Formula restricted to one activity ("Autres activités"); null = general gym access. */
  activityCategory: ActivityCategory | null;
  isActive: boolean;
}

export type SubscriptionStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface Subscription {
  id: string;
  userId: string;
  subscriptionPlanId: string | null;
  status: SubscriptionStatus;
  isActive: boolean;
  activationDate: string | null;
  expiresAt: string | null;
  pausedAt: string | null;
  /** End of the 90-day pause ceiling, set while paused. */
  pausedUntil: string | null;
  pauseCount: number;
  maxPauses: number;
  /** Sessions left on a credit-based formula; null for duration formulas. */
  sessionsRemaining: number | null;
  partnerUserId: string | null;
  createdAt: string;
}

export interface CreateSubscriptionResult {
  subscription: Subscription;
  partnerSubscription?: Subscription;
}

export async function getPlans(): Promise<SubscriptionPlan[]> {
  const response = await apiFetch('/subscriptions/plans');
  if (!response.ok) throw new Error(await extractErrorMessage(response));
  return response.json();
}

export async function createSubscriptionRequest(
  subscriptionPlanId: string,
  partnerPhone?: string,
): Promise<CreateSubscriptionResult> {
  const response = await apiFetch('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ subscriptionPlanId, ...(partnerPhone ? { partnerPhone } : {}) }),
  });
  if (!response.ok) throw new Error(await extractErrorMessage(response));
  return response.json();
}

export async function getMySubscriptions(): Promise<Subscription[]> {
  const response = await apiFetch('/subscriptions/me');
  if (!response.ok) throw new Error(await extractErrorMessage(response));
  return response.json();
}
