import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as coachingApi from '../api/coaching';
import type { MyBooking } from '../api/coaching';
import { dayLabel, groupByDay, slotTitle, timeRange } from '../lib/coaching';
import { categoryKey, categoryLabel } from '../lib/plans';
import { colors, radii, spacing } from '../theme/tokens';
import type { ClientStackParamList } from '../navigation/RootNavigator';

type MyBookingsNavigationProp = NativeStackNavigationProp<ClientStackParamList, 'MyBookings'>;

export default function MyBookingsScreen() {
  const navigation = useNavigation<MyBookingsNavigationProp>();

  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBookings(await coachingApi.getMyBookings());
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      setError(null);
      load()
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger vos réservations.');
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  async function cancel(booking: MyBooking) {
    setError(null);
    setNotice(null);
    setCancellingId(booking.id);
    try {
      await coachingApi.cancelBooking(booking.id);
      await load();
      setNotice(booking.usedCredit ? 'Réservation annulée, la séance a été recréditée.' : 'Réservation annulée.');
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'annulation a échoué.");
    } finally {
      setCancellingId(null);
    }
  }

  function confirmCancel(booking: MyBooking) {
    Alert.alert(
      'Annuler cette réservation ?',
      `${slotTitle(booking.slot)}\n${dayLabel(booking.slot.startsAt)} · ${timeRange(booking.slot.startsAt, booking.slot.durationMinutes)}` +
        (booking.usedCredit ? '\n\nLa séance sera recréditée sur votre solde.' : ''),
      [
        { text: 'Garder', style: 'cancel' },
        { text: 'Annuler la réservation', style: 'destructive', onPress: () => cancel(booking) },
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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {bookings.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.meta}>Aucune réservation à venir.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CoachingSlots')}>
            <Text style={styles.link}>Voir les créneaux</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {groupByDay(bookings.map((b) => ({ ...b, startsAt: b.slot.startsAt }))).map(({ day, slots: dayBookings }) => (
        <View key={day} style={styles.dayBlock}>
          <Text style={styles.dayTitle}>{day}</Text>
          {dayBookings.map((booking) => (
            <View key={booking.id} style={styles.card}>
              <View style={styles.cardTopRow}>
                <Text style={styles.time}>{timeRange(booking.slot.startsAt, booking.slot.durationMinutes)}</Text>
                <Text style={styles.chip}>{categoryLabel(categoryKey(booking.slot.activityCategory))}</Text>
              </View>
              <Text style={styles.slotTitle}>{slotTitle(booking.slot)}</Text>
              <Text style={styles.meta}>
                Coach {booking.slot.coach.name}
                {booking.usedCredit ? ' · 1 séance utilisée' : ''}
              </Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => confirmCancel(booking)}
                disabled={cancellingId !== null}
              >
                {cancellingId === booking.id ? (
                  <ActivityIndicator color={colors.bad} />
                ) : (
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}
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
  link: {
    color: colors.info,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  cancelButton: {
    width: '100%',
    borderColor: colors.bad,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  cancelButtonText: {
    color: colors.bad,
    fontWeight: '700',
  },
});
