import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as subscriptionsApi from '../api/subscriptions';
import type { Subscription, SubscriptionPlan } from '../api/subscriptions';
import { useAuth } from '../context/AuthContext';
import { categoryLabel, planDisplayName } from '../lib/plans';
import {
  canSubscribeSomewhere,
  creditsText,
  groupSubscriptions,
  validityText,
  type SubscriptionEntry,
  type SubscriptionState,
} from '../lib/subscriptions';
import { colors, radii, spacing } from '../theme/tokens';
import type { ClientStackParamList } from '../navigation/RootNavigator';

type ClientDashboardNavigationProp = NativeStackNavigationProp<ClientStackParamList, 'ClientDashboard'>;

const STATE_LABELS: Record<SubscriptionState, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Actif', color: colors.good, bg: colors.goodSoft },
  PAUSED: { label: 'En pause', color: colors.brand, bg: colors.brandSoft },
  NO_CREDITS: { label: 'Séances épuisées', color: colors.bad, bg: colors.badSoft },
  PENDING: { label: 'En attente de validation', color: colors.info, bg: colors.infoSoft },
  EXPIRED: { label: 'Expiré', color: colors.bad, bg: colors.badSoft },
  CANCELLED: { label: 'Annulé', color: colors.muted, bg: colors.surface2 },
};

function SubscriptionCard({ entry }: { entry: SubscriptionEntry }) {
  const { subscription, plan, category, state } = entry;
  const credits = creditsText(subscription, plan);
  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.categoryChip}>{categoryLabel(category)}</Text>
        <View style={[styles.badge, { backgroundColor: STATE_LABELS[state].bg }]}>
          <Text style={[styles.badgeText, { color: STATE_LABELS[state].color }]}>{STATE_LABELS[state].label}</Text>
        </View>
      </View>
      <Text style={styles.planName}>{plan ? planDisplayName(plan.name) : 'Formule'}</Text>

      {credits ? <Text style={styles.credits}>{credits}</Text> : null}
      {state === 'ACTIVE' || state === 'PAUSED' ? <Text style={styles.meta}>{validityText(subscription)}</Text> : null}
      {state === 'PENDING' ? (
        <Text style={styles.meta}>Votre demande est en attente de validation par un modérateur.</Text>
      ) : null}
    </View>
  );
}

export default function ClientDashboardScreen() {
  const navigation = useNavigation<ClientDashboardNavigationProp>();
  const { logout } = useAuth();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refetches every time this screen regains focus — including on the way
  // back from ChooseFormula/PaymentInstructions/UploadProof/PaymentStatus,
  // so the dashboard reflects the just-submitted request without a manual reload.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      setError(null);
      Promise.all([subscriptionsApi.getMySubscriptions(), subscriptionsApi.getPlans()])
        .then(([subs, plansList]) => {
          if (cancelled) return;
          setSubscriptions(subs);
          setPlans(plansList);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : 'Impossible de charger votre abonnement.');
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const { current, pending, lastEnded } = groupSubscriptions(subscriptions, plans);
  // One subscription per category: "S'abonner" stays available while any
  // category of the catalogue is free (see unavailableCategories —
  // ChooseFormula greys out the taken ones).
  const canSubscribe = canSubscribeSomewhere(subscriptions, plans);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tableau de bord Client</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {current.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{current.length > 1 ? 'Mes abonnements' : 'Mon abonnement'}</Text>
          {current.map((entry) => (
            <SubscriptionCard key={entry.subscription.id} entry={entry} />
          ))}
        </>
      ) : null}

      {pending.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Demandes en cours</Text>
          {pending.map((entry) => (
            <SubscriptionCard key={entry.subscription.id} entry={entry} />
          ))}
        </>
      ) : null}

      {current.length === 0 && pending.length === 0 ? (
        lastEnded ? (
          <SubscriptionCard entry={lastEnded} />
        ) : (
          <View style={styles.card}>
            <Text style={styles.meta}>Aucun abonnement en cours.</Text>
          </View>
        )
      ) : null}

      {canSubscribe ? (
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ChooseFormula')}>
          <Text style={styles.buttonText}>S'abonner</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.logout} onPress={() => logout()}>
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow: 1,
    width: '100%',
    backgroundColor: colors.bg,
    padding: spacing.xxl,
  },
  centered: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTopRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryChip: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  credits: {
    color: colors.brand,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  planName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    width: '100%',
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    width: '100%',
    color: colors.bad,
    marginBottom: spacing.md,
  },
  logout: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.muted,
    fontWeight: '600',
  },
});
