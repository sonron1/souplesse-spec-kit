import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors, radii, spacing } from '../theme/tokens';
import type { AuthStackParamList } from '../navigation/RootNavigator';

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation<LoginNavigationProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>

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
        placeholder="Mot de passe"
        placeholderTextColor={colors.muted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!isSubmitting}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.buttonText}>Se connecter</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={isSubmitting}>
        <Text style={styles.link}>Pas de compte ? Créer un compte</Text>
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
