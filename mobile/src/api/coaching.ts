import { apiFetch, extractErrorMessage } from './client';
import type { ActivityCategory } from './subscriptions';

// Matches souplesse-api's CoachingSlot / CoachingBooking models and the
// shapes returned by coaching.service.ts.

export interface CoachingSlot {
  id: string;
  coachId: string;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  /** Free text shown to clients, e.g. "Cardio". */
  title: string | null;
  /** Only subscribers of this activity can book; null = general session. */
  activityCategory: ActivityCategory | null;
  createdAt: string;
}

/** GET /coaching/slots — upcoming slots with room left, plus those the caller already booked. */
export interface AvailableSlot extends CoachingSlot {
  coach: { id: string; name: string };
  bookedCount: number;
  remaining: number;
  bookedByMe: boolean;
}

export type CoachingBookingStatus = 'CONFIRMED' | 'CANCELLED' | 'ATTENDED';

export interface CoachingBooking {
  id: string;
  slotId: string;
  userId: string;
  subscriptionId: string;
  /** A session was taken from a credit-based subscription — refunded on cancellation. */
  usedCredit: boolean;
  status: CoachingBookingStatus;
  cancelledAt: string | null;
  createdAt: string;
}

/** GET /coaching/bookings/me — upcoming confirmed bookings, soonest first. */
export interface MyBooking extends CoachingBooking {
  slot: CoachingSlot & { coach: { id: string; name: string } };
}

export interface CoachSlotBooking {
  id: string;
  user: { id: string; name: string; firstName: string | null; lastName: string | null };
}

/** GET /coaching/slots/mine — the coach's slots not yet ended, with who booked them. */
export interface CoachSlot extends CoachingSlot {
  bookings: CoachSlotBooking[];
}

export interface CreateSlotInput {
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  title?: string;
  activityCategory?: ActivityCategory;
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(await extractErrorMessage(response));
  return response.json();
}

export async function getAvailableSlots(): Promise<AvailableSlot[]> {
  return json(await apiFetch('/coaching/slots'));
}

export async function bookSlot(slotId: string): Promise<CoachingBooking> {
  return json(await apiFetch('/coaching/bookings', { method: 'POST', body: JSON.stringify({ slotId }) }));
}

export async function getMyBookings(): Promise<MyBooking[]> {
  return json(await apiFetch('/coaching/bookings/me'));
}

export async function cancelBooking(bookingId: string): Promise<CoachingBooking> {
  return json(await apiFetch(`/coaching/bookings/${bookingId}/cancel`, { method: 'PATCH' }));
}

export async function createSlot(input: CreateSlotInput): Promise<CoachingSlot> {
  return json(await apiFetch('/coaching/slots', { method: 'POST', body: JSON.stringify(input) }));
}

export async function getMySlots(): Promise<CoachSlot[]> {
  return json(await apiFetch('/coaching/slots/mine'));
}
