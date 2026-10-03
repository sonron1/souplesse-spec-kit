import type { Subscription, SubscriptionPlan } from '../api/subscriptions';
import { categoryKey, type CategoryKey } from './plans';

// Pure rules for a client's subscriptions — no React Native import, so they
// can be exercised outside the app against real API responses.
//
// souplesse-api (2026-10-03): categories are independent — one subscription
// in force per category (general access, Fit Dance, Taekwondo, Box), so a
// client can hold several at once. GET /subscriptions/me expires stale rows
// itself, so an ACTIVE row it returns is in force.

export const CATEGORY_ORDER: CategoryKey[] = ['GENERAL', 'FIT_DANCE', 'TAEKWONDO', 'BOXING'];

export type SubscriptionState = 'ACTIVE' | 'PAUSED' | 'NO_CREDITS' | 'PENDING' | 'EXPIRED' | 'CANCELLED';

export interface SubscriptionEntry {
  subscription: Subscription;
  /** null for a formula no longer in the catalogue. */
  plan: SubscriptionPlan | null;
  category: CategoryKey;
  state: SubscriptionState;
}

export function subscriptionState(sub: Subscription): SubscriptionState {
  if (sub.status !== 'ACTIVE') return sub.status;
  if (sub.pausedAt) return 'PAUSED';
  if (sub.sessionsRemaining === 0) return 'NO_CREDITS';
  return 'ACTIVE';
}

export function toEntry(sub: Subscription, plans: SubscriptionPlan[]): SubscriptionEntry {
  const plan = plans.find((p) => p.id === sub.subscriptionPlanId) ?? null;
  // Same as souplesse-api's categoryWhere: no plan, or a plan without
  // activityCategory, is general access.
  return { subscription: sub, plan, category: categoryKey(plan?.activityCategory ?? null), state: subscriptionState(sub) };
}

function byCategory(a: SubscriptionEntry, b: SubscriptionEntry): number {
  return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
}

export interface ClientSubscriptions {
  /** Subscriptions in force (active, paused or out of credits), one per category at most. */
  current: SubscriptionEntry[];
  /** Requests waiting for a moderator. */
  pending: SubscriptionEntry[];
  /** Most recent ended subscription — shown only when nothing is current or pending. */
  lastEnded: SubscriptionEntry | null;
}

export function groupSubscriptions(subs: Subscription[], plans: SubscriptionPlan[]): ClientSubscriptions {
  const entries = subs.map((s) => toEntry(s, plans)); // API order: most recent first
  const current = entries.filter((e) => e.subscription.status === 'ACTIVE').sort(byCategory);
  const pending = entries.filter((e) => e.state === 'PENDING').sort(byCategory);
  const ended = entries.filter((e) => e.state === 'EXPIRED' || e.state === 'CANCELLED');
  return { current, pending, lastEnded: current.length === 0 && pending.length === 0 ? (ended[0] ?? null) : null };
}

export type UnavailableReason = 'ACTIVE' | 'PAUSED' | 'PENDING';

/**
 * Categories where a new request makes no sense. ACTIVE/PAUSED mirror
 * souplesse-api's assertNotBlocked (409) — a credit-based subscription with
 * no session left no longer blocks. PENDING is an app-side rule: the API
 * accepts a second pending request, but there's no screen to resume an old
 * one, so allowing it would only pile duplicates up in the moderator queue.
 */
export function unavailableCategories(subs: Subscription[], plans: SubscriptionPlan[]): Map<CategoryKey, UnavailableReason> {
  const result = new Map<CategoryKey, UnavailableReason>();
  for (const entry of subs.map((s) => toEntry(s, plans))) {
    if (entry.state === 'ACTIVE') result.set(entry.category, 'ACTIVE');
    else if (entry.state === 'PAUSED') result.set(entry.category, 'PAUSED');
    else if (entry.state === 'PENDING' && !result.has(entry.category)) result.set(entry.category, 'PENDING');
  }
  return result;
}

export const UNAVAILABLE_LABELS: Record<UnavailableReason, string> = {
  ACTIVE: 'Abonnement en cours',
  PAUSED: 'Abonnement en pause',
  PENDING: 'Demande en attente',
};

/** True while at least one formula of the catalogue can still be requested. */
export function canSubscribeSomewhere(subs: Subscription[], plans: SubscriptionPlan[]): boolean {
  const unavailable = unavailableCategories(subs, plans);
  return plans.some((p) => !unavailable.has(categoryKey(p.activityCategory)));
}

export function daysRemaining(expiresAt: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 86_400_000));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Validity line of a subscription in force. */
export function validityText(sub: Subscription, now = Date.now()): string {
  if (sub.pausedAt) {
    return sub.pausedUntil ? `En pause — à reprendre avant le ${formatDate(sub.pausedUntil)}` : 'En pause';
  }
  if (!sub.expiresAt) return 'Sans date limite';
  const days = daysRemaining(sub.expiresAt, now);
  return days === 0 ? "Expire aujourd'hui" : `Expire dans ${days} jour${days > 1 ? 's' : ''}`;
}

/** Session balance of a credit-based subscription; null for a duration formula. */
export function creditsText(sub: Subscription, plan: SubscriptionPlan | null): string | null {
  if (sub.sessionsRemaining === null) return null;
  const left = sub.sessionsRemaining;
  if (left === 0) return 'Aucune séance restante';
  const total = plan?.sessionCredits;
  const label = `${left} séance${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}`;
  return total ? `${label} sur ${total}` : label;
}
