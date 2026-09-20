import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as paymentsApi from '../api/payments';
import type { MobileOperator } from '../api/payments';
import { MOBILE_MONEY_OPERATOR_LABELS } from '../config/mobileMoneyNumbers';
import { colors, radii, spacing } from '../theme/tokens';
import type { ClientStackParamList } from '../navigation/RootNavigator';

type UploadProofNavigationProp = NativeStackNavigationProp<ClientStackParamList, 'UploadProof'>;
type UploadProofRouteProp = RouteProp<ClientStackParamList, 'UploadProof'>;

const OPERATORS: MobileOperator[] = ['MTN', 'MOOV', 'CELTIIS'];

interface PickedImage {
  uri: string;
  name: string;
  mimeType: string;
}

function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

export default function UploadProofScreen() {
  const navigation = useNavigation<UploadProofNavigationProp>();
  const { params } = useRoute<UploadProofRouteProp>();
  const { subscriptionId, amount, planName } = params;

  const [amountDeclared, setAmountDeclared] = useState(String(amount));
  const [senderPhone, setSenderPhone] = useState('');
  const [operator, setOperator] = useState<MobileOperator | null>(null);
  const [image, setImage] = useState<PickedImage | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedAmount = Number(amountDeclared);
  const canSubmit =
    !!operator &&
    senderPhone.trim().length > 0 &&
    !!image &&
    Number.isInteger(parsedAmount) &&
    parsedAmount > 0;

  async function handlePickImage() {
    setError(null);
    setIsPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("L'accès à vos photos est nécessaire pour joindre une capture d'écran.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      setImage({
        uri: asset.uri,
        name: asset.fileName ?? `capture-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    } catch {
      setError("Impossible d'ouvrir la galerie photo.");
    } finally {
      setIsPicking(false);
    }
  }

  async function handleSubmit() {
    if (!operator || !image) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await paymentsApi.submitProof({
        subscriptionId,
        amountDeclared: parsedAmount,
        senderPhone: senderPhone.trim(),
        operator,
        imageUri: image.uri,
        imageName: image.name,
        imageMimeType: image.mimeType,
      });
      // Clears ChooseFormula/PaymentInstructions/UploadProof from history —
      // ClientDashboard stays underneath so the back gesture from
      // PaymentStatus lands there directly, not back into a used-up form.
      navigation.reset({
        index: 1,
        routes: [{ name: 'ClientDashboard' }, { name: 'PaymentStatus', params: { subscriptionId, amount: parsedAmount, planName } }],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Preuve de paiement</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Formule sélectionnée</Text>
        <Text style={styles.summaryPlan}>{planName}</Text>
        <Text style={styles.summaryAmount}>{formatFcfa(amount)}</Text>
      </View>

      <Text style={styles.label}>Montant transféré</Text>
      <TextInput
        style={styles.input}
        placeholder="Montant en FCFA"
        placeholderTextColor={colors.muted}
        value={amountDeclared}
        onChangeText={setAmountDeclared}
        keyboardType="number-pad"
        editable={!isSubmitting}
      />

      <Text style={styles.label}>Numéro utilisé pour le transfert</Text>
      <TextInput
        style={styles.input}
        placeholder="Votre numéro Mobile Money"
        placeholderTextColor={colors.muted}
        value={senderPhone}
        onChangeText={setSenderPhone}
        keyboardType="phone-pad"
        editable={!isSubmitting}
      />

      <Text style={styles.label}>Opérateur</Text>
      <View style={styles.operatorRow}>
        {OPERATORS.map((op) => (
          <TouchableOpacity
            key={op}
            style={[styles.operatorButton, operator === op && styles.operatorButtonActive]}
            onPress={() => setOperator(op)}
            disabled={isSubmitting}
          >
            <Text style={[styles.operatorText, operator === op && styles.operatorTextActive]}>
              {MOBILE_MONEY_OPERATOR_LABELS[op]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Capture d'écran de confirmation</Text>
      {image ? (
        <TouchableOpacity onPress={handlePickImage} disabled={isSubmitting || isPicking}>
          <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />
          <Text style={styles.link}>Changer d'image</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.pickButton} onPress={handlePickImage} disabled={isSubmitting || isPicking}>
          {isPicking ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <Text style={styles.pickButtonText}>Choisir une capture d'écran</Text>
          )}
        </TouchableOpacity>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.buttonText}>Envoyer</Text>
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
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  summaryCard: {
    width: '100%',
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
  label: {
    width: '100%',
    color: colors.muted,
    fontSize: 13,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
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
  operatorRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  operatorButton: {
    flexGrow: 1,
    flexBasis: '30%',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  operatorButtonActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  operatorText: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  operatorTextActive: {
    color: colors.brand,
  },
  pickButton: {
    width: '100%',
    borderColor: colors.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  pickButtonText: {
    color: colors.muted,
    fontWeight: '600',
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  link: {
    color: colors.info,
    textAlign: 'center',
    marginTop: spacing.sm,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 16,
  },
});
