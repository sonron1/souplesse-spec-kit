import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as coachingApi from '../api/coaching';
import type { CoachSlot } from '../api/coaching';
import { useAuth } from '../context/AuthContext';
import { clientName, fillText, groupByDay, isInProgress, slotTitle, timeRange } from '../lib/coaching';
import { categoryKey, categoryLabel } from '../lib/plans';
import { colors, radii, spacing } from '../theme/tokens';
import type { CoachStackParamList } from '../navigation/RootNavigator';

type CoachDashboardNavigationProp = NativeStackNavigationProp<CoachStackParamList, 'CoachDashboard'>;

export default function CoachDashboardScreen() {
  const navigation = useNavigation<CoachDashboardNavigationProp>();
  const { user, logout } = useAuth();

  const [slots, setSlots] = useState<CoachSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refetches on focus — including on the way back from CreateSlot.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      setError(null);
      coachingApi
        .getMySlots()
        .then((list) => {
          if (!cancelled) setSlots(list);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger vos créneaux.');
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
      <Text style={styles.title}>Bonjour{user?.firstName ? ` ${user.firstName}` : ''}</Text>
      <Text style={styles.subtitle}>Vos créneaux à venir</Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('CreateSlot')}>
        <Text style={styles.buttonText}>Nouveau créneau</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {slots.length === 0 && !error ? (
        <View style={styles.card}>
          <Text style={styles.meta}>Aucun créneau à venir. Créez-en un pour que vos clients puissent réserver.</Text>
        </View>
      ) : null}

      {groupByDay(slots).map(({ day, slots: daySlots }) => (
        <View key={day} style={styles.dayBlock}>
          <Text style={styles.dayTitle}>{day}</Text>
          {daySlots.map((slot) => (
            <View key={slot.id} style={styles.card}>
              <View style={styles.cardTopRow}>
                <Text style={styles.time}>{timeRange(slot.startsAt, slot.durationMinutes)}</Text>
                <View style={styles.chipRow}>
                  {isInProgress(slot) ? <Text style={styles.liveChip}>En cours</Text> : null}
                  <Text style={styles.chip}>{categoryLabel(categoryKey(slot.activityCategory))}</Text>
                </View>
              </View>
              <Text style={styles.slotTitle}>{slotTitle(slot)}</Text>
              <Text style={styles.fill}>{fillText(slot)}</Text>
              {slot.bookings.length > 0 ? (
                slot.bookings.map((booking) => (
                  <Text key={booking.id} style={styles.client}>
                    • {clientName(booking)}
                  </Text>
                ))
              ) : (
                <Text style={styles.meta}>Aucune réservation pour l'instant.</Text>
              )}
            </View>
          ))}
        </View>
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
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  button: {
    width: '100%',
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
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
  chipRow: {
    flexDirection: 'row',
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
  liveChip: {
    color: colors.good,
    backgroundColor: colors.goodSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  slotTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  fill: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  client: {
    color: colors.text,
    fontSize: 14,
    marginTop: 2,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
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
