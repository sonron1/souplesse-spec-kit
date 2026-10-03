import type { AvailableSlot, CoachingSlot } from '../api/coaching';
import type { Subscription, SubscriptionPlan } from '../api/subscriptions';
import { categoryKey, categoryLabel, type CategoryKey } from './plans';
import { toEntry } from './subscriptions';

// Pure coaching rules — no React Native import, so they can be exercised
// outside the app against real API responses.

/**
 * Why a client can or can't book a slot — mirrors souplesse-api's
 * CoachingService.book() checks, in the same order, so the app greys a slot
 * out for the reason the API would give.
 */
export type SlotAvailability =
  | 'BOOKABLE'
  | 'BOOKED'
  | 'NO_SUBSCRIPTION' // 403 no_active_subscription
  | 'NOT_COVERED' // 403 activity_not_covered
  | 'PAUSED' // 400 subscription_paused
  | 'EXPIRES_BEFORE' // 400 subscription_expires_before_slot
  | 'NO_CREDITS' // 400 no_sessions_left
  | 'FULL'; // 409 slot_full

export interface SlotStatus {
  availability: SlotAvailability;
  /** Booking it takes one session from a credit-based subscription. */
  usesCredit: boolean;
  /** Why it can't be booked, for the greyed-out card; null when bookable or booked. */
  reason: string | null;
}

/** The client's subscription in force in a category (ACTIVE rows from GET /subscriptions/me are in force). */
export function subscriptionInForce(
  subs: Subscription[],
  plans: SubscriptionPlan[],
  category: CategoryKey,
): Subscription | null {
  const matches = subs
    .filter((s) => s.status === 'ACTIVE' && toEntry(s, plans).category === category)
    .sort((a, b) => (b.activationDate ?? '').localeCompare(a.activationDate ?? ''));
  return matches[0] ?? null;
}

export function slotStatus(slot: AvailableSlot, subs: Subscription[], plans: SubscriptionPlan[]): SlotStatus {
  const category = categoryKey(slot.activityCategory);
  const sub = subscriptionInForce(subs, plans, category);
  const usesCredit = sub?.sessionsRemaining != null;

  if (slot.bookedByMe) return { availability: 'BOOKED', usesCredit, reason: null };
  if (!sub) {
    const hasAny = subs.some((s) => s.status === 'ACTIVE');
    return hasAny
      ? { availability: 'NOT_COVERED', usesCredit: false, reason: `Réservé aux abonnés ${categoryLabel(category)}` }
      : { availability: 'NO_SUBSCRIPTION', usesCredit: false, reason: 'Abonnement actif nécessaire' };
  }
  if (sub.pausedAt) return { availability: 'PAUSED', usesCredit, reason: 'Abonnement en pause' };
  if (sub.expiresAt && new Date(sub.expiresAt).getTime() <= new Date(slot.startsAt).getTime()) {
    return { availability: 'EXPIRES_BEFORE', usesCredit, reason: 'Votre abonnement aura expiré à cette date' };
  }
  if (usesCredit && sub.sessionsRemaining! <= 0) return { availability: 'NO_CREDITS', usesCredit, reason: 'Solde de séances épuisé' };
  if (slot.remaining <= 0) return { availability: 'FULL', usesCredit, reason: 'Complet' };
  return { availability: 'BOOKABLE', usesCredit, reason: null };
}

/** Categories the client can book in — those with a subscription in force. */
export function coveredCategories(subs: Subscription[], plans: SubscriptionPlan[]): Set<CategoryKey> {
  return new Set(subs.filter((s) => s.status === 'ACTIVE').map((s) => toEntry(s, plans).category));
}

export type SlotFilter = 'MINE' | 'ALL';

/**
 * "Mes activités" keeps only slots of the client's categories (and those
 * already booked); "Tout voir" shows everything, the rest greyed out.
 */
export function filterSlots(
  slots: AvailableSlot[],
  subs: Subscription[],
  plans: SubscriptionPlan[],
  filter: SlotFilter,
): AvailableSlot[] {
  if (filter === 'ALL') return slots;
  const covered = coveredCategories(subs, plans);
  return slots.filter((s) => s.bookedByMe || covered.has(categoryKey(s.activityCategory)));
}

/** Groups slots by local calendar day, keeping the API's chronological order. */
export function groupByDay<T extends Pick<CoachingSlot, 'startsAt'>>(slots: T[]): { day: string; slots: T[] }[] {
  const groups: { day: string; slots: T[] }[] = [];
  for (const slot of slots) {
    const day = dayLabel(slot.startsAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.slots.push(slot);
    else groups.push({ day, slots: [slot] });
  }
  return groups;
}

export function dayLabel(iso: string): string {
  const label = new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function time(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function timeRange(startsAt: string, durationMinutes: number): string {
  const start = new Date(startsAt);
  return `${time(start)} – ${time(new Date(start.getTime() + durationMinutes * 60_000))}`;
}

/** Title shown on a slot card: the coach's free text, else the activity. */
export function slotTitle(slot: Pick<CoachingSlot, 'title' | 'activityCategory'>): string {
  return slot.title?.trim() || (slot.activityCategory ? categoryLabel(slot.activityCategory) : 'Séance collective');
}

export function placesText(remaining: number): string {
  if (remaining <= 0) return 'Complet';
  return `${remaining} place${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`;
}
