import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { MOBILE_MONEY_NUMBERS, MOBILE_MONEY_OPERATOR_LABELS } from '../config/mobileMoneyNumbers';
import { colors, radii, spacing } from '../theme/tokens';
import type { ClientStackParamList } from '../navigation/RootNavigator';

type PaymentInstructionsRouteProp = RouteProp<ClientStackParamList, 'PaymentInstructions'>;

function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

// L'écran d'upload de preuve (E08) sera ajouté au bloc 5 — cet écran reste
// une étape informative autonome pour l'instant (bouton "J'ai payé" ajouté
// lors du branchement avec UploadProofScreen).
export default function PaymentInstructionsScreen() {
  const { params } = useRoute<PaymentInstructionsRouteProp>();
  const { planName, amount } = params;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Instructions de paiement</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Formule sélectionnée</Text>
        <Text style={styles.summaryPlan}>{planName}</Text>
        <Text style={styles.summaryAmount}>{formatFcfa(amount)}</Text>
      </View>

      <Text style={styles.instructions}>
        Effectuez un transfert Mobile Money du montant exact ci-dessus vers l'un des
        numéros suivants, selon votre opérateur :
      </Text>

      {(Object.keys(MOBILE_MONEY_NUMBERS) as Array<keyof typeof MOBILE_MONEY_NUMBERS>).map((operator) => (
        <View key={operator} style={styles.numberCard}>
          <Text style={styles.numberOperator}>{MOBILE_MONEY_OPERATOR_LABELS[operator]}</Text>
          <Text style={styles.numberValue}>{MOBILE_MONEY_NUMBERS[operator]}</Text>
        </View>
      ))}

      <Text style={styles.note}>
        Une fois le transfert effectué, revenez dans l'application pour envoyer votre
        capture d'écran de confirmation — votre abonnement sera activé après
        vérification par un modérateur.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    padding: spacing.xxl,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  summaryCard: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  summaryPlan: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  summaryAmount: {
    color: colors.brand,
    fontSize: 22,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  instructions: {
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  numberCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  numberOperator: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  numberValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  note: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
