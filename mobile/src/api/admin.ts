import { apiFetch, extractErrorMessage } from './client';

// Matches souplesse-api's AdminStats (admin-stats.service.ts), as serialized
// to JSON (dates become ISO strings).
export interface AdminStats {
  generatedAt: string;
  /** Distinct clients whose subscription is in force; a used-up credit-based one doesn't count. */
  members: { active: number; paused: number };
  /** Those same subscriptions by formula, most taken first (a couple counts twice). */
  planDistribution: { planId: string | null; name: string; count: number }[];
  payments: {
    pending: number;
    oldestPendingSince: string | null;
    /** Moderation decisions of the last 30 days. */
    last30Days: { approved: number; rejected: number; averageReviewHours: number | null };
  };
  /** Approved payment proofs of the current month, in the gym's time zone (Cotonou, UTC+1). */
  revenue: { month: string; from: string; to: string; amount: number; currency: 'XOF'; approvedProofs: number };
}

export async function getStats(): Promise<AdminStats> {
  const response = await apiFetch('/admin/stats');
  if (!response.ok) throw new Error(await extractErrorMessage(response));
  return response.json();
}
