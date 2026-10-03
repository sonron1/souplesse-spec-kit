import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as coachingApi from '../api/coaching';
import type { ActivityCategory } from '../api/subscriptions';
import { DURATION_CHOICES, buildSlotInput, durationLabel, nextDays } from '../lib/coaching';
import { ACTIVITY_LABELS } from '../lib/plans';
import { colors, radii, spacing } from '../theme/tokens';
import type { CoachStackParamList } from '../navigation/RootNavigator';

type CreateSlotNavigationProp = NativeStackNavigationProp<CoachStackParamList, 'CreateSlot'>;

// A slot is either a general session (general-access subscriptions) or
// restricted to one activity (its subscribers only) — souplesse-api's
// CoachingSlot.activityCategory.
const CATEGORY_CHOICES: { value: ActivityCategory | null; label: string }[] = [
  { value: null, label: 'Accès salle' },
  ...(Object.keys(ACTIVITY_LABELS) as ActivityCategory[]).map((value) => ({ value, label: ACTIVITY_LABELS[value] })),
];

const DAY_CHOICES_COUNT = 14;

export default function CreateSlotScreen() {
  const navigation = useNavigation<CreateSlotNavigationProp>();

  const [days] = useState(() => nextDays(DAY_CHOICES_COUNT));
  const [dayIndex, setDayIndex] = useState(1);
  const [time, setTime] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [capacity, setCapacity] = useState('10');
  const [title, setTitle] = useState('');
  const [activityCategory, setActivityCategory] = useState<ActivityCategory | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    const built = buildSlotInput({ day: days[dayIndex].date, time, durationMinutes, capacity, title, activityCategory });
    if (!built.ok) {
      setError(built.error);
      return;
    }
    setIsSubmitting(true);
    try {
      await coachingApi.createSlot(built.input);
      navigation.goBack(); // the dashboard refetches on focus
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Jour</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {days.map((d, i) => (
          <TouchableOpacity
            key={d.date.toISOString()}
            style={[styles.choice, i === dayIndex && styles.choiceActive]}
            onPress={() => setDayIndex(i)}
            disabled={isSubmitting}
          >
            <Text style={[styles.choiceText, i === dayIndex && styles.choiceTextActive]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Heure de début</Text>
      <TextInput
        style={styles.input}
        placeholder="18:00"
        placeholderTextColor={colors.muted}
        value={time}
        onChangeText={setTime}
        keyboardType="numbers-and-punctuation"
        editable={!isSubmitting}
      />

      <Text style={styles.label}>Durée</Text>
      <View style={styles.wrapRow}>
        {DURATION_CHOICES.map((minutes) => (
          <TouchableOpacity
            key={minutes}
            style={[styles.choice, minutes === durationMinutes && styles.choiceActive]}
            onPress={() => setDurationMinutes(minutes)}
            disabled={isSubmitting}
          >
            <Text style={[styles.choiceText, minutes === durationMinutes && styles.choiceTextActive]}>
              {durationLabel(minutes)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Activité</Text>
      <View style={styles.wrapRow}>
        {CATEGORY_CHOICES.map((choice) => (
          <TouchableOpacity
            key={choice.label}
            style={[styles.choice, choice.value === activityCategory && styles.choiceActive]}
            onPress={() => setActivityCategory(choice.value)}
            disabled={isSubmitting}
          >
            <Text style={[styles.choiceText, choice.value === activityCategory && styles.choiceTextActive]}>{choice.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.hint}>
        {activityCategory
          ? `Réservable uniquement par les abonnés ${ACTIVITY_LABELS[activityCategory]}.`
          : 'Réservable par les abonnés à la salle (abonnements, séances et carnets).'}
      </Text>

      <Text style={styles.label}>Nombre de places</Text>
      <TextInput
        style={styles.input}
        placeholder="10"
        placeholderTextColor={colors.muted}
        value={capacity}
        onChangeText={setCapacity}
        keyboardType="number-pad"
        editable={!isSubmitting}
      />

      <Text style={styles.label}>Titre (facultatif)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex. Cardio, Renforcement, Débutants…"
        placeholderTextColor={colors.muted}
        value={title}
        onChangeText={setTitle}
        maxLength={80}
        editable={!isSubmitting}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>Créer le créneau</Text>}
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
  label: {
    width: '100%',
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipRow: {
    gap: spacing.sm,
  },
  wrapRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choice: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  choiceActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  choiceText: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 13,
  },
  choiceTextActive: {
    color: colors.brand,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.sm,
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
    width: '100%',
    color: colors.bad,
    marginTop: spacing.lg,
  },
  button: {
    width: '100%',
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 16,
  },
});
