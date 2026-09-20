import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing } from '../theme/tokens';
import type { ClientStackParamList } from '../navigation/RootNavigator';

type PaymentStatusNavigationProp = NativeStackNavigationProp<ClientStackParamList, 'PaymentStatus'>;
type PaymentStatusRouteProp = RouteProp<ClientStackParamList, 'PaymentStatus'>;

function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

// Confirmation-only screen (E09): souplesse-api has no endpoint for a client
// to poll their own proof's moderation state (only the moderator queue
// exists), so this can't show live progress — just what we know right after
// a successful POST /payments/proof. ClientDashboardScreen (E05) picks up
// the subscription's real status (PENDING/ACTIVE/...) from there on.
export default function PaymentStatusScreen() {
  const navigation = useNavigation<PaymentStatusNavigationProp>();
  const { params } = useRoute<PaymentStatusRouteProp>();
  const { planName, amount } = params;

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>✓</Text>
      </View>

      <Text style={styles.title}>Preuve envoyée</Text>
      <Text style={styles.subtitle}>
        Votre preuve de paiement pour la formule « {planName} » ({formatFcfa(amount)}) a bien été transmise.
        Un modérateur va la vérifier ; vous recevrez un SMS et une notification dès que votre abonnement sera activé.
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ClientDashboard')}>
        <Text style={styles.buttonText}>Retour au tableau de bord</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.goodSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    color: colors.good,
    fontSize: 32,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xxl,
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
});
