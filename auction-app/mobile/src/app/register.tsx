import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { spacing, useColors } from '../lib/theme';
import { Button, ErrorBanner, Field, T } from '../components/ui';

export default function RegisterScreen() {
  const { register } = useAuth();
  const c = useColors();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await register({ displayName, email, password, city });
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
          <T variant="title">Crea tu cuenta</T>
          <T color={c.textMuted}>Es gratis. Puja, vende y sigue tus artículos favoritos.</T>
        </View>
        <Field label="Nombre visible" value={displayName} onChangeText={setDisplayName} maxLength={30} autoComplete="name" hint="Otros usuarios verán solo una versión parcial en las pujas." />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Ciudad (opcional)" value={city} onChangeText={setCity} />
        <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" hint="Mínimo 8 caracteres." />
        {error ? <ErrorBanner message={error} /> : null}
        <Button title="Crear cuenta" size="lg" loading={busy} onPress={submit} />
        <T variant="small" color={c.textFaint} style={{ textAlign: 'center' }}>
          Al registrarte aceptas los Términos y la Política de privacidad. Las pujas son compromisos de compra vinculantes.
        </T>
        <Pressable onPress={() => router.replace('/login')} style={{ alignItems: 'center', padding: spacing.sm }}>
          <T color={c.textMuted}>¿Ya tienes cuenta? <T color={c.primary} style={{ fontWeight: '700' }}>Inicia sesión</T></T>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
