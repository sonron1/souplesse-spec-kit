import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as coachingApi from '../api/coaching';
import type { AvailableSlot } from '../api/coaching';
import * as subscriptionsApi from '../api/subscriptions';
import type { Subscription, SubscriptionPlan } from '../api/subscriptions';
import {
  coveredCategories,
  dayLabel,
  filterSlots,
  groupByDay,
  placesText,
  slotStatus,
  slotTitle,
  timeRange,
  type SlotFilter,
} from '../lib/coaching';
import { categoryKey, categoryLabel, planDisplayName } from '../lib/plans';
import { creditsText, groupSubscriptions } from '../lib/subscriptions';
import { colors, radii, spacing } from '../theme/tokens';
import type { ClientStackParamList } from '../navigation/RootNavigator';

type CoachingSlotsNavigationProp = NativeStackNavigationProp<ClientStackParamList, 'CoachingSlots'>;

export default function CoachingSlotsScreen() {
  const navigation = useNavigation<CoachingSlotsNavigationProp>();

  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [filter, setFilter] = useState<SlotFilter>('MINE');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [slotList, subs, planList] = await Promise.all([
      coachingApi.getAvailableSlots(),
      subscriptionsApi.getMySubscriptions(),
      subscriptionsApi.getPlans(),
    ]);
    setSlots(slotList);
    setSubscriptions(subs);
    setPlans(planList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      setError(null);
      load()
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger les créneaux.');
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  async function book(slot: AvailableSlot) {
    setError(null);
    setNotice(null);
    setBookingSlotId(slot.id);
    try {
      await coachingApi.bookSlot(slot.id);
      await load(); // remaining places and session balance both changed
      setNotice(`Réservation confirmée : ${slotTitle(slot)}, ${dayLabel(slot.startsAt).toLowerCase()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La réservation a échoué.');
    } finally {
      setBookingSlotId(null);
    }
  }

  function confirmBooking(slot: AvailableSlot, usesCredit: boolean) {
    Alert.alert(
      'Réserver ce créneau ?',
      `${slotTitle(slot)}\n${dayLabel(slot.startsAt)} · ${timeRange(slot.startsAt, slot.durationMinutes)}` +
        (usesCredit ? '\n\nUne séance sera décomptée de votre solde.' : ''),
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réserver', onPress: () => book(slot) },
      ],
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  const covered = coveredCategories(subscriptions, plans);
  const creditBalances = groupSubscriptions(subscriptions, plans).current.filter((e) => e.subscription.sessionsRemaining !== null);
  const visible = filterSlots(slots, subscriptions, plans, filter);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {covered.size === 0 ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Un abonnement actif est nécessaire pour réserver un créneau.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ChooseFormula')}>
            <Text style={styles.link}>Choisir une formule</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {creditBalances.map((entry) => (
        <Text key={entry.subscription.id} style={styles.balance}>
          {entry.plan ? planDisplayName(entry.plan.name) : 'Formule'} : {creditsText(entry.subscription, entry.plan)}
        </Text>
      ))}

      <View style={styles.segmentRow}>
        {(['MINE', 'ALL'] as const).map((value) => (
          <TouchableOpacity
            key={value}
            style={[styles.segmentButton, filter === value && styles.segmentButtonActive]}
            onPress={() => setFilter(value)}
          >
            <Text style={[styles.segmentText, filter === value && styles.segmentTextActive]}>
              {value === 'MINE' ? 'Mes activités' : 'Tout voir'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {visible.length === 0 ? (
        <Text style={styles.empty}>
          {slots.length === 0
            ? 'Aucun créneau disponible dans les 14 prochains jours.'
            : 'Aucun créneau pour vos activités pour le moment. Touchez « Tout voir » pour afficher les autres.'}
        </Text>
      ) : null}

      {groupByDay(visible).map(({ day, slots: daySlots }) => (
        <View key={day} style={styles.dayBlock}>
          <Text style={styles.dayTitle}>{day}</Text>
          {daySlots.map((slot) => {
            const status = slotStatus(slot, subscriptions, plans);
            const greyed = status.reason !== null;
            return (
              <View key={slot.id} style={[styles.card, greyed && styles.cardGreyed]}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.time}>{timeRange(slot.startsAt, slot.durationMinutes)}</Text>
                  <Text style={styles.chip}>{categoryLabel(categoryKey(slot.activityCategory))}</Text>
                </View>
                <Text style={styles.slotTitle}>{slotTitle(slot)}</Text>
                <Text style={styles.meta}>
                  Coach {slot.coach.name} · {placesText(slot.remaining)}
                </Text>

                {status.availability === 'BOOKED' ? (
                  <Text style={styles.booked}>Réservé — annulable depuis « Mes réservations »</Text>
                ) : greyed ? (
                  <Text style={styles.reason}>{status.reason}</Text>
                ) : (
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => confirmBooking(slot, status.usesCredit)}
                    disabled={bookingSlotId !== null}
                  >
                    {bookingSlotId === slot.id ? (
                      <ActivityIndicator color={colors.bg} />
                    ) : (
                      <Text style={styles.bookButtonText}>Réserver{status.usesCredit ? ' (1 séance)' : ''}</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      ))}

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('MyBookings')}>
        <Text style={styles.secondaryButtonText}>Mes réservations</Text>
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
    padding: spacing.xl,
  },
  centered: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    width: '100%',
    backgroundColor: colors.infoSoft,
    borderColor: colors.info,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  bannerText: {
    color: colors.text,
    fontSize: 14,
  },
  link: {
    color: colors.info,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  balance: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  segmentRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
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
  notice: {
    width: '100%',
    color: colors.good,
    marginBottom: spacing.md,
  },
  error: {
    width: '100%',
    color: colors.bad,
    marginBottom: spacing.md,
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  dayBlock: {
    width: '100%',
    marginBottom: spacing.md,
  },
  dayTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.sm,
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
  cardGreyed: {
    opacity: 0.5,
  },
  cardTopRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  time: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
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
  slotTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  booked: {
    color: colors.good,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  reason: {
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: spacing.md,
  },
  bookButton: {
    width: '100%',
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  bookButtonText: {
    color: colors.bg,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
});
