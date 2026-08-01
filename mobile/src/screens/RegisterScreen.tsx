import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors, radii, spacing } from '../theme/tokens';
import type { AuthStackParamList } from '../navigation/RootNavigator';

type RegisterNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;
type Gender = 'MALE' | 'FEMALE';

export default function RegisterScreen() {
  const { register } = useAuth();
  const navigation = useNavigation<RegisterNavigationProp>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (!gender) {
      setError('Merci de sélectionner votre genre.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        gender,
        password,
        confirmPassword,
      });
      setIsRegistered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isRegistered) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Compte créé</Text>
        <Text style={styles.info}>
          Vérifiez votre boîte mail pour valider votre adresse avant de vous connecter.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Créer un compte</Text>

      <TextInput
        style={styles.input}
        placeholder="Prénom"
        placeholderTextColor={colors.muted}
        value={firstName}
        onChangeText={setFirstName}
        editable={!isSubmitting}
      />
      <TextInput
        style={styles.input}
        placeholder="Nom"
        placeholderTextColor={colors.muted}
        value={lastName}
        onChangeText={setLastName}
        editable={!isSubmitting}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.muted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!isSubmitting}
      />
      <TextInput
        style={styles.input}
        placeholder="Téléphone"
        placeholderTextColor={colors.muted}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        editable={!isSubmitting}
      />

      <View style={styles.genderRow}>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'MALE' && styles.genderButtonActive]}
          onPress={() => setGender('MALE')}
          disabled={isSubmitting}
        >
          <Text style={[styles.genderButtonText, gender === 'MALE' && styles.genderButtonTextActive]}>
            Homme
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'FEMALE' && styles.genderButtonActive]}
          onPress={() => setGender('FEMALE')}
          disabled={isSubmitting}
        >
          <Text style={[styles.genderButtonText, gender === 'FEMALE' && styles.genderButtonTextActive]}>
            Femme
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor={colors.muted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!isSubmitting}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmer le mot de passe"
        placeholderTextColor={colors.muted}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!isSubmitting}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.buttonText}>Créer mon compte</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={isSubmitting}>
        <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  info: {
    color: colors.muted,
    marginBottom: spacing.xxl,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.text,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  genderRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  genderButton: {
    flex: 1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  genderButtonActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  genderButtonText: {
    color: colors.muted,
    fontWeight: '600',
  },
  genderButtonTextActive: {
    color: colors.brand,
  },
  error: {
    color: colors.bad,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
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
