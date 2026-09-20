import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as authApi from '../api/auth';
import { colors, radii, spacing } from '../theme/tokens';
import type { AuthStackParamList } from '../navigation/RootNavigator';

type VerifyOtpNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'VerifyOtp'>;
type VerifyOtpRouteProp = RouteProp<AuthStackParamList, 'VerifyOtp'>;

export default function VerifyOtpScreen() {
  const navigation = useNavigation<VerifyOtpNavigationProp>();
  const { params } = useRoute<VerifyOtpRouteProp>();
  const { phone } = params;

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleVerify() {
    setError(null);
    setInfo(null);
    setIsSubmitting(true);
    try {
      await authApi.verifyOtp(phone, code.trim());
      // Reset the stack so the back gesture can't return to a consumed OTP screen.
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    setIsResending(true);
    try {
      await authApi.resendOtp(phone);
      setInfo('Un nouveau code a été envoyé par SMS.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vérification du téléphone</Text>
      <Text style={styles.subtitle}>
        Un code à 6 chiffres a été envoyé par SMS au {phone}. Saisissez-le ci-dessous.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Code à 6 chiffres"
        placeholderTextColor={colors.muted}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        editable={!isSubmitting}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}

      <TouchableOpacity
        style={[styles.button, code.trim().length !== 6 && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={isSubmitting || code.trim().length !== 6}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.buttonText}>Vérifier</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResend} disabled={isResending || isSubmitting}>
        <Text style={styles.link}>{isResending ? 'Envoi en cours…' : 'Renvoyer le code'}</Text>
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
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.muted,
    marginBottom: spacing.xxl,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.text,
    padding: spacing.lg,
    marginBottom: spacing.md,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: 'center',
  },
  error: {
    color: colors.bad,
    marginBottom: spacing.md,
  },
  info: {
    color: colors.good,
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
  link: {
    color: colors.info,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
