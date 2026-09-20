import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing } from '../theme/tokens';
import type { ClientStackParamList } from '../navigation/RootNavigator';

type ClientDashboardNavigationProp = NativeStackNavigationProp<ClientStackParamList, 'ClientDashboard'>;

// Squelette temporaire — le vrai dashboard (statut d'abonnement, compteur de
// jours restants) est construit au bloc 6 (handoff mobile). Le bouton
// ci-dessous existe déjà pour que le parcours formule -> paiement (blocs 3-4)
// soit testable de bout en bout.
export default function ClientDashboardScreen() {
  const navigation = useNavigation<ClientDashboardNavigationProp>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tableau de bord Client</Text>
      <Text style={styles.placeholder}>
        (squelette temporaire — statut d'abonnement à venir au bloc 6)
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ChooseFormula')}>
        <Text style={styles.buttonText}>S'abonner</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  placeholder: {
    color: colors.muted,
    marginBottom: spacing.xxl,
  },
  button: {
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
});
