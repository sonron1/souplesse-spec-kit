import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as subscriptionsApi from '../api/subscriptions';
import type { SubscriptionPlan } from '../api/subscriptions';
import { colors, radii, spacing } from '../theme/tokens';
import type { ClientStackParamList } from '../navigation/RootNavigator';

type ChooseFormulaNavigationProp = NativeStackNavigationProp<ClientStackParamList, 'ChooseFormula'>;

function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

export default function ChooseFormulaScreen() {
  const navigation = useNavigation<ChooseFormulaNavigationProp>();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isCouple, setIsCouple] = useState(false);
  const [partnerPhone, setPartnerPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    subscriptionsApi
      .getPlans()
      .then(setPlans)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Impossible de charger les formules.'))
      .finally(() => setIsLoadingPlans(false));
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const canSubmit = !!selectedPlan && (!isCouple || partnerPhone.trim().length > 0);

  async function handleSubmit() {
    if (!selectedPlan) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await subscriptionsApi.createSubscriptionRequest(
        selectedPlan.id,
        isCouple ? partnerPhone.trim() : undefined,
      );
      const amount = isCouple ? (selectedPlan.priceCouple ?? selectedPlan.priceSingle) : selectedPlan.priceSingle;
      navigation.navigate('PaymentInstructions', {
        subscriptionId: result.subscription.id,
        amount,
        planName: selectedPlan.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingPlans) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{loadError}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Choisir une formule</Text>

      {plans.map((plan) => {
        const isSelected = plan.id === selectedPlanId;
        return (
          <TouchableOpacity
            key={plan.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => setSelectedPlanId(plan.id)}
            disabled={isSubmitting}
          >
            <Text style={styles.cardName}>{plan.name}</Text>
            <Text style={styles.cardPrice}>{formatFcfa(plan.priceSingle)} (Solo)</Text>
            {plan.priceCouple != null ? (
              <Text style={styles.cardPriceCouple}>{formatFcfa(plan.priceCouple)} (Couple)</Text>
            ) : null}
            <Text style={styles.cardMeta}>
              Validité : {plan.validityDays} jours
              {plan.maxPauses > 0 ? ` · ${plan.maxPauses} report(s) possible(s)` : ' · pas de report'}
            </Text>
          </TouchableOpacity>
        );
      })}

      {selectedPlan ? (
        <View style={styles.optionsBlock}>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[styles.segmentButton, !isCouple && styles.segmentButtonActive]}
              onPress={() => setIsCouple(false)}
              disabled={isSubmitting}
            >
              <Text style={[styles.segmentText, !isCouple && styles.segmentTextActive]}>Solo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, isCouple && styles.segmentButtonActive]}
              onPress={() => setIsCouple(true)}
              disabled={isSubmitting}
            >
              <Text style={[styles.segmentText, isCouple && styles.segmentTextActive]}>Couple</Text>
            </TouchableOpacity>
          </View>

          {isCouple ? (
            <TextInput
              style={styles.input}
              placeholder="Téléphone du partenaire (compte mobile déjà vérifié)"
              placeholderTextColor={colors.muted}
              value={partnerPhone}
              onChangeText={setPartnerPhone}
              keyboardType="phone-pad"
              editable={!isSubmitting}
            />
          ) : null}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.buttonText}>Continuer</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    padding: spacing.xxl,
  },
  centered: {
    flex: 1,
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  cardName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  cardPrice: {
    color: colors.text,
    fontSize: 15,
  },
  cardPriceCouple: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2,
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  optionsBlock: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  segmentButton: {
    flex: 1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  segmentButtonActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  segmentText: {
    color: colors.muted,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.brand,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.text,
    padding: spacing.lg,
  },
  error: {
    color: colors.bad,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 16,
  },
});
