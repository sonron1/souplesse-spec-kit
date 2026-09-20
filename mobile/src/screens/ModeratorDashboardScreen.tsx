import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as paymentsApi from '../api/payments';
import type { PendingPaymentProof } from '../api/payments';
import { MOBILE_MONEY_OPERATOR_LABELS } from '../config/mobileMoneyNumbers';
import { useAuth } from '../context/AuthContext';
import { colors, radii, spacing } from '../theme/tokens';
import type { ModeratorStackParamList } from '../navigation/RootNavigator';

type ModeratorDashboardNavigationProp = NativeStackNavigationProp<ModeratorStackParamList, 'ModeratorDashboard'>;

function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

export default function ModeratorDashboardScreen() {
  const navigation = useNavigation<ModeratorDashboardNavigationProp>();
  const { logout } = useAuth();

  const [proofs, setProofs] = useState<PendingPaymentProof[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refetches on focus so a just-validated/rejected proof (handled on
  // PaymentReview) disappears from the queue as soon as we come back here.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      setError(null);
      paymentsApi
        .getPending()
        .then((result) => {
          if (!cancelled) setProofs(result.items);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger la file de modération.');
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>File de modération</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!error && proofs.length === 0 ? <Text style={styles.empty}>Aucun paiement en attente.</Text> : null}

      {proofs.map((proof) => (
        <TouchableOpacity
          key={proof.id}
          style={styles.card}
          onPress={() => navigation.navigate('PaymentReview', { proof })}
        >
          <Text style={styles.cardUser}>{proof.user.name}</Text>
          <Text style={styles.cardPlan}>{proof.subscription.subscriptionPlan?.name ?? 'Formule'}</Text>
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardMeta}>{formatFcfa(proof.amountDeclared)}</Text>
            <Text style={styles.cardMeta}>{MOBILE_MONEY_OPERATOR_LABELS[proof.operator]}</Text>
          </View>
        </TouchableOpacity>
      ))}

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
  empty: {
    color: colors.muted,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardUser: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardPlan: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  cardMeta: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '600',
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
