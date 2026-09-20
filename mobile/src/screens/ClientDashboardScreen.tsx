import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as subscriptionsApi from '../api/subscriptions';
import type { Subscription, SubscriptionPlan } from '../api/subscriptions';
import { useAuth } from '../context/AuthContext';
import { colors, radii, spacing } from '../theme/tokens';
import type { ClientStackParamList } from '../navigation/RootNavigator';

type ClientDashboardNavigationProp = NativeStackNavigationProp<ClientStackParamList, 'ClientDashboard'>;

const STATUS_LABELS: Record<Subscription['status'], { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Actif', color: colors.good, bg: colors.goodSoft },
  PENDING: { label: 'En attente de validation', color: colors.info, bg: colors.infoSoft },
  EXPIRED: { label: 'Expiré', color: colors.bad, bg: colors.badSoft },
  CANCELLED: { label: 'Annulé', color: colors.muted, bg: colors.surface2 },
};

function daysRemaining(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
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

  const current = subscriptions[0] ?? null;
  const currentPlanName = plans.find((p) => p.id === current?.subscriptionPlanId)?.name ?? 'Formule';
  // souplesse-api's assertNotBlocked only rejects a new request while
  // ACTIVE (pause never changes status away from ACTIVE) — it does allow a
  // second PENDING request, since it has no notion of "already has one
  // outstanding". The app deliberately hides "S'abonner" for PENDING too:
  // there's no screen to resume a specific old request, so letting the user
  // tap through again would just pile up duplicate PENDING rows in the
  // moderator queue for the same person.
  const canSubscribe = !subscriptions.some((s) => s.status === 'ACTIVE' || s.status === 'PENDING');

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

      {current ? (
        <View style={styles.card}>
          <View style={[styles.badge, { backgroundColor: STATUS_LABELS[current.status].bg }]}>
            <Text style={[styles.badgeText, { color: STATUS_LABELS[current.status].color }]}>
              {STATUS_LABELS[current.status].label}
            </Text>
          </View>
          <Text style={styles.planName}>{currentPlanName}</Text>

          {current.status === 'ACTIVE' && current.pausedAt ? (
            <Text style={styles.meta}>Abonnement en pause.</Text>
          ) : null}
          {current.status === 'ACTIVE' && !current.pausedAt && current.expiresAt ? (
            <Text style={styles.meta}>
              {daysRemaining(current.expiresAt) === 0
                ? 'Expire aujourd\'hui'
                : `Expire dans ${daysRemaining(current.expiresAt)} jour(s)`}
            </Text>
          ) : null}
          {current.status === 'PENDING' ? (
            <Text style={styles.meta}>
              Votre demande est en attente de validation par un modérateur.
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.meta}>Aucun abonnement en cours.</Text>
        </View>
      )}

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
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
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
