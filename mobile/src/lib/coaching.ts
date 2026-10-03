import type { AvailableSlot, CoachSlot, CoachSlotBooking, CoachingSlot } from '../api/coaching';
import type { ActivityCategory, Subscription, SubscriptionPlan } from '../api/subscriptions';
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

// ─── Coach side ────────────────────────────────────────────────────────────

export function isInProgress(slot: Pick<CoachingSlot, 'startsAt' | 'durationMinutes'>, now = Date.now()): boolean {
  const start = new Date(slot.startsAt).getTime();
  return start <= now && now < start + slot.durationMinutes * 60_000;
}

export function fillText(slot: Pick<CoachSlot, 'bookings' | 'capacity'>): string {
  const n = slot.bookings.length;
  return `${n}/${slot.capacity} inscrit${n > 1 ? 's' : ''}${n >= slot.capacity ? ' · complet' : ''}`;
}

export function clientName(booking: CoachSlotBooking): string {
  const full = [booking.user.firstName, booking.user.lastName].filter(Boolean).join(' ').trim();
  return full || booking.user.name;
}

/** Day choices for a new slot: today and the next days, as local dates at midnight. */
export function nextDays(count: number, now = new Date()): { date: Date; label: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const label =
      i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    return { date, label };
  });
}

/** "18:00", "18h00", "9:30" → minutes since midnight; null if not a valid time. */
export function parseTime(text: string): number | null {
  const m = text.trim().match(/^([01]?\d|2[0-3])\s*[:hH]\s*([0-5]\d)?$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2] ?? 0);
}

export const DURATION_CHOICES = [30, 45, 60, 90, 120];

/** 45 → "45 min", 60 → "1 h", 90 → "1 h 30". */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)} h${rest ? ` ${rest}` : ''}`;
}

export interface SlotForm {
  day: Date;
  time: string;
  durationMinutes: number;
  capacity: string;
  title: string;
  activityCategory: ActivityCategory | null;
}

/**
 * Validates the coach's form with souplesse-api's CreateSlotDto bounds
 * (duration 15–240 min, capacity 1–50, title ≤ 80) and its "must start in
 * the future" rule. Returns the request body, or the message to show.
 */
export function buildSlotInput(
  form: SlotForm,
  now = Date.now(),
): { ok: true; input: { startsAt: string; durationMinutes: number; capacity: number; title?: string; activityCategory?: ActivityCategory } } | { ok: false; error: string } {
  const minutes = parseTime(form.time);
  if (minutes === null) return { ok: false, error: 'Heure invalide (ex. 18:00).' };
  const start = new Date(form.day.getFullYear(), form.day.getMonth(), form.day.getDate(), Math.floor(minutes / 60), minutes % 60);
  if (start.getTime() <= now) return { ok: false, error: 'Le créneau doit commencer dans le futur.' };
  if (!Number.isInteger(form.durationMinutes) || form.durationMinutes < 15 || form.durationMinutes > 240) {
    return { ok: false, error: 'Durée invalide (15 à 240 minutes).' };
  }
  const capacity = Number(form.capacity);
  if (!/^\d+$/.test(form.capacity.trim()) || capacity < 1 || capacity > 50) {
    return { ok: false, error: 'Nombre de places invalide (1 à 50).' };
  }
  const title = form.title.trim();
  if (title.length > 80) return { ok: false, error: 'Titre trop long (80 caractères maximum).' };
  return {
    ok: true,
    input: {
      startsAt: start.toISOString(),
      durationMinutes: form.durationMinutes,
      capacity,
      ...(title ? { title } : {}),
      ...(form.activityCategory ? { activityCategory: form.activityCategory } : {}),
    },
  };
}
