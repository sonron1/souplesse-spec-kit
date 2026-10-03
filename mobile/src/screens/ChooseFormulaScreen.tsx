import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as subscriptionsApi from '../api/subscriptions';
import type { Subscription, SubscriptionPlan } from '../api/subscriptions';
import { UNAVAILABLE_LABELS, unavailableCategories } from '../lib/subscriptions';
import {
  SECTION_TITLES,
  categoryKey,
  categoryLabel,
  formatFcfa,
  groupPlans,
  hasCouplePrice,
  planDisplayName,
  planTermsText,
} from '../lib/plans';
import { colors, radii, spacing } from '../theme/tokens';
import type { ClientStackParamList } from '../navigation/RootNavigator';

type ChooseFormulaNavigationProp = NativeStackNavigationProp<ClientStackParamList, 'ChooseFormula'>;

export default function ChooseFormulaScreen() {
  const navigation = useNavigation<ChooseFormulaNavigationProp>();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<Subscription[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isCouple, setIsCouple] = useState(false);
  const [partnerPhone, setPartnerPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([subscriptionsApi.getPlans(), subscriptionsApi.getMySubscriptions()])
      .then(([plansList, subs]) => {
        setPlans(plansList);
        setMySubscriptions(subs);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Impossible de charger les formules.'))
      .finally(() => setIsLoadingPlans(false));
  }, []);

  // One subscription per category: formulas of a category already taken
  // (in force, paused, or with a request awaiting moderation) can't be picked.
  const unavailable = unavailableCategories(mySubscriptions, plans);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  // The Solo/Couple selector stays visible on arrival (prices of every card
  // follow it) and disappears once a solo-only formula is picked.
  const showCoupleSelector = !selectedPlan || hasCouplePrice(selectedPlan);
  const coupleSelected = isCouple && !!selectedPlan && hasCouplePrice(selectedPlan);
  const canSubmit = !!selectedPlan && (!coupleSelected || partnerPhone.trim().length > 0);

  function handleSelectPlan(plan: SubscriptionPlan) {
    setSelectedPlanId(plan.id);
    // souplesse-api rejects a couple request on a solo-only formula (couple_not_available).
    if (!hasCouplePrice(plan)) setIsCouple(false);
  }

  async function handleSubmit() {
    if (!selectedPlan) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await subscriptionsApi.createSubscriptionRequest(
        selectedPlan.id,
        coupleSelected ? partnerPhone.trim() : undefined,
      );
      const amount = coupleSelected ? selectedPlan.priceCouple! : selectedPlan.priceSingle;
      navigation.navigate('PaymentInstructions', {
        subscriptionId: result.subscription.id,
        amount,
        planName: planDisplayName(selectedPlan.name),
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Choisir une formule</Text>

      {showCoupleSelector ? (
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

      {groupPlans(plans).map(({ section, plans: sectionPlans }) => (
        <View key={section} style={styles.section}>
          <Text style={styles.sectionTitle}>{SECTION_TITLES[section].title}</Text>
          <Text style={styles.sectionHint}>{SECTION_TITLES[section].hint}</Text>
          {sectionPlans.map((plan) => {
            const isSelected = plan.id === selectedPlanId;
            const showCouplePrice = isCouple && hasCouplePrice(plan);
            const displayPrice = showCouplePrice ? plan.priceCouple! : plan.priceSingle;
            const unavailableReason = unavailable.get(categoryKey(plan.activityCategory));
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.card, isSelected && styles.cardSelected, unavailableReason ? styles.cardUnavailable : null]}
                onPress={() => handleSelectPlan(plan)}
                disabled={isSubmitting || !!unavailableReason}
              >
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardName}>{planDisplayName(plan.name)}</Text>
                  <Text style={styles.cardPrice}>
                    {formatFcfa(displayPrice)}{' '}
                    <Text style={styles.cardPriceMode}>({showCouplePrice ? 'Couple' : 'Solo'})</Text>
                  </Text>
                </View>
                <View style={styles.chipRow}>
                  <Text style={styles.chip}>{categoryLabel(categoryKey(plan.activityCategory))}</Text>
                  {!hasCouplePrice(plan) ? <Text style={styles.chipMuted}>Solo uniquement</Text> : null}
                  {unavailableReason ? (
                    <Text style={styles.chipMuted}>{UNAVAILABLE_LABELS[unavailableReason]}</Text>
                  ) : null}
                </View>
                <Text style={styles.cardMeta}>{planTermsText(plan)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

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
    marginBottom: spacing.md,
  },
  cardSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  cardUnavailable: {
    opacity: 0.45,
  },
  cardHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardName: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  cardPrice: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  cardPriceMode: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  cardMeta: {
    width: '100%',
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  section: {
    width: '100%',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  chipRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    color: colors.brand,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  chipMuted: {
    color: colors.muted,
    backgroundColor: colors.surface2,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  optionsBlock: {
    width: '100%',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  segmentRow: {
    width: '100%',
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
    width: '100%',
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
    width: '100%',
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
