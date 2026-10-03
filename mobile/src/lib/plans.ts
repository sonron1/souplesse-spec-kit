import type { ActivityCategory, SubscriptionPlan } from '../api/subscriptions';

// Pure display rules for the subscription catalogue — no React Native import,
// so they can be exercised outside the app against real API responses.

export const ACTIVITY_LABELS: Record<ActivityCategory, string> = {
  FIT_DANCE: 'Fit Dance',
  TAEKWONDO: 'Taekwondo',
  BOXING: 'Box',
};

/** Categories are independent on souplesse-api: one subscription in force per category. */
export type CategoryKey = 'GENERAL' | ActivityCategory;

export function categoryKey(activityCategory: ActivityCategory | null): CategoryKey {
  return activityCategory ?? 'GENERAL';
}

export function categoryLabel(key: CategoryKey): string {
  return key === 'GENERAL' ? 'Accès salle' : ACTIVITY_LABELS[key];
}

export type PlanSection = 'DURATION' | 'CREDITS' | 'ACTIVITY';

export const SECTION_ORDER: PlanSection[] = ['DURATION', 'CREDITS', 'ACTIVITY'];

export const SECTION_TITLES: Record<PlanSection, { title: string; hint: string }> = {
  DURATION: { title: 'Abonnements', hint: 'Accès à la salle et aux séances, sans limite pendant la durée.' },
  CREDITS: { title: 'Séances & carnets', hint: 'Chaque réservation de créneau utilise une séance.' },
  ACTIVITY: { title: 'Autres activités', hint: "Accès réservé à l'activité choisie." },
};

export function planSection(plan: Pick<SubscriptionPlan, 'sessionCredits' | 'activityCategory'>): PlanSection {
  if (plan.activityCategory !== null) return 'ACTIVITY';
  if (plan.sessionCredits !== null) return 'CREDITS';
  return 'DURATION';
}

/** Groups plans by section, keeping the API's order inside each section and dropping empty sections. */
export function groupPlans<T extends Pick<SubscriptionPlan, 'sessionCredits' | 'activityCategory'>>(
  plans: T[],
): { section: PlanSection; plans: T[] }[] {
  return SECTION_ORDER.map((section) => ({ section, plans: plans.filter((p) => planSection(p) === section) })).filter(
    (group) => group.plans.length > 0,
  );
}

/** souplesse-api names every mobile formula "Mobile — …"; the prefix means nothing to a client. */
export function planDisplayName(name: string): string {
  return name.replace(/^Mobile — /, '');
}

function sessionsText(count: number): string {
  return `${count} séance${count > 1 ? 's' : ''}`;
}

/** What the formula gives: sessions and validity — never "null jours" for a formula without fixed validity. */
export function planTermsText(
  plan: Pick<SubscriptionPlan, 'sessionCredits' | 'validityDays' | 'maxPauses'>,
): string {
  const parts: string[] = [];
  if (plan.sessionCredits !== null) {
    parts.push(sessionsText(plan.sessionCredits));
    parts.push(plan.validityDays === null ? 'sans date limite' : `à utiliser sous ${plan.validityDays} jours`);
  } else {
    parts.push(plan.validityDays === null ? 'sans date limite' : `Validité : ${plan.validityDays} jours`);
    parts.push('séances illimitées');
  }
  parts.push(plan.maxPauses > 0 ? `${plan.maxPauses} report${plan.maxPauses > 1 ? 's' : ''} possible${plan.maxPauses > 1 ? 's' : ''}` : 'pas de report');
  return parts.join(' · ');
}

export function hasCouplePrice(plan: Pick<SubscriptionPlan, 'priceCouple'>): boolean {
  return plan.priceCouple !== null;
}

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}
