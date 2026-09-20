import { apiFetch, extractErrorMessage } from './client';

// Matches souplesse-api's SubscriptionPlan / Subscription Prisma models —
// only the fields the mobile UI actually uses.
export interface SubscriptionPlan {
  id: string;
  name: string;
  priceSingle: number;
  priceCouple: number | null;
  validityDays: number;
  maxPauses: number;
  isActive: boolean;
}

export type SubscriptionStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface Subscription {
  id: string;
  userId: string;
  subscriptionPlanId: string | null;
  status: SubscriptionStatus;
  isActive: boolean;
  expiresAt: string | null;
  pausedAt: string | null;
  pauseCount: number;
  maxPauses: number;
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
