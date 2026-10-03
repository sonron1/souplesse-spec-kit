import type { AdminStats } from '../api/admin';
import { planDisplayName } from './plans';

// Pure display rules for the Admin dashboard — no React Native import, so
// they can be exercised outside the app against real API responses.

/** "2026-10" → "Octobre 2026". */
export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  // Mid-month at noon UTC: the same calendar month in any time zone.
  const label = new Date(Date.UTC(year, m - 1, 15, 12)).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function decimal(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

/** Average moderation time: "—" without decisions, minutes under an hour, days past two. */
export function reviewTimeText(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${decimal(hours)} h`;
  return `${decimal(hours / 24)} j`;
}

/** How long the oldest pending proof has been waiting. */
export function waitingText(since: string | null, now = Date.now()): string | null {
  if (!since) return null;
  const minutes = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000));
  if (minutes < 60) return `le plus ancien attend depuis ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `le plus ancien attend depuis ${hours} h`;
  return `le plus ancien attend depuis ${Math.floor(hours / 24)} j`;
}

export interface DistributionRow {
  key: string;
  label: string;
  count: number;
  /** Share of all subscriptions in force, 0–100, for the bar width. */
  percent: number;
}

export function distributionRows(distribution: AdminStats['planDistribution']): DistributionRow[] {
  const total = distribution.reduce((sum, row) => sum + row.count, 0);
  return distribution.map((row) => ({
    key: row.planId ?? 'none',
    label: planDisplayName(row.name),
    count: row.count,
    percent: total ? Math.round((row.count / total) * 100) : 0,
  }));
}

export function approvedThisMonthText(count: number): string {
  return count === 0 ? 'Aucun paiement validé ce mois-ci' : `${count} paiement${count > 1 ? 's' : ''} validé${count > 1 ? 's' : ''} ce mois-ci`;
}

export function updatedAtText(generatedAt: string): string {
  return `Mis à jour à ${new Date(generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}
