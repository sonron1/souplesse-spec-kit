import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as paymentsApi from '../api/payments';
import { MOBILE_MONEY_OPERATOR_LABELS } from '../config/mobileMoneyNumbers';
import { colors, radii, spacing } from '../theme/tokens';
import type { ModeratorStackParamList } from '../navigation/RootNavigator';

type PaymentReviewNavigationProp = NativeStackNavigationProp<ModeratorStackParamList, 'PaymentReview'>;
type PaymentReviewRouteProp = RouteProp<ModeratorStackParamList, 'PaymentReview'>;

function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

export default function PaymentReviewScreen() {
  const navigation = useNavigation<PaymentReviewNavigationProp>();
  const { params } = useRoute<PaymentReviewRouteProp>();
  const { proof } = params;
  const plan = proof.subscription.subscriptionPlan;

  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [isLoadingScreenshot, setIsLoadingScreenshot] = useState(true);

  const [rejectionReason, setRejectionReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeciding, setIsDeciding] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    let cancelled = false;
    paymentsApi
      .fetchScreenshotDataUri(proof.id)
      .then((uri) => {
        if (!cancelled) setScreenshotUri(uri);
      })
      .catch((err) => {
        if (!cancelled) setScreenshotError(err instanceof Error ? err.message : "Impossible de charger la capture d'écran.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingScreenshot(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proof.id]);

  const declaredMismatch =
    plan != null && proof.amountDeclared !== plan.priceSingle && proof.amountDeclared !== plan.priceCouple;

  async function handleApprove() {
    setError(null);
    setIsDeciding('approve');
    try {
      await paymentsApi.approveProof(proof.id);
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsDeciding(null);
    }
  }

  async function handleReject() {
    if (rejectionReason.trim().length < 3) {
      setReasonError('Le motif de rejet est requis (3 caractères minimum).');
      return;
    }
    setReasonError(null);
    setError(null);
    setIsDeciding('reject');
    try {
      await paymentsApi.rejectProof(proof.id, rejectionReason.trim());
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsDeciding(null);
    }
  }

  const isBusy = isDeciding !== null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Client</Text>
        <Text style={styles.value}>{proof.user.name}</Text>
        <Text style={styles.meta}>{proof.user.phone ?? proof.user.email}</Text>

        <Text style={styles.label}>Formule</Text>
        <Text style={styles.value}>{plan?.name ?? 'Formule'}</Text>

        <Text style={styles.label}>Montant déclaré</Text>
        <Text style={styles.value}>{formatFcfa(proof.amountDeclared)}</Text>
        {declaredMismatch ? (
          <Text style={styles.warning}>
            Ne correspond à aucun tarif connu de cette formule ({formatFcfa(plan!.priceSingle)}
            {plan!.priceCouple != null ? ` / ${formatFcfa(plan!.priceCouple)}` : ''}).
          </Text>
        ) : null}

        <Text style={styles.label}>Émetteur du transfert</Text>
        <Text style={styles.value}>
          {proof.senderPhone} · {MOBILE_MONEY_OPERATOR_LABELS[proof.operator]}
        </Text>
      </View>

      <Text style={styles.label}>Capture d'écran</Text>
      <View style={styles.screenshotBox}>
        {isLoadingScreenshot ? (
          <ActivityIndicator color={colors.brand} />
        ) : screenshotUri ? (
          <Image source={{ uri: screenshotUri }} style={styles.screenshot} resizeMode="contain" />
        ) : (
          <Text style={styles.error}>{screenshotError}</Text>
        )}
      </View>

      <Text style={styles.label}>Motif de rejet (requis pour rejeter)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex. montant incorrect, capture illisible…"
        placeholderTextColor={colors.muted}
        value={rejectionReason}
        onChangeText={setRejectionReason}
        editable={!isBusy}
        multiline
      />
      {reasonError ? <Text style={styles.error}>{reasonError}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={handleReject} disabled={isBusy}>
          {isDeciding === 'reject' ? (
            <ActivityIndicator color={colors.bad} />
          ) : (
            <Text style={styles.rejectButtonText}>Rejeter</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.approveButton]} onPress={handleApprove} disabled={isBusy}>
          {isDeciding === 'approve' ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.approveButtonText}>Valider</Text>
          )}
        </TouchableOpacity>
      </View>
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
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  label: {
    width: '100%',
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.md,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  warning: {
    color: colors.bad,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  screenshotBox: {
    width: '100%',
    minHeight: 260,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  screenshot: {
    width: '100%',
    height: 320,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.text,
    padding: spacing.lg,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    width: '100%',
    color: colors.bad,
    marginTop: spacing.md,
  },
  actionsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  button: {
    flex: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: colors.good,
  },
  approveButtonText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 16,
  },
  rejectButton: {
    backgroundColor: colors.badSoft,
    borderColor: colors.bad,
    borderWidth: 1,
  },
  rejectButtonText: {
    color: colors.bad,
    fontWeight: '700',
    fontSize: 16,
  },
});
