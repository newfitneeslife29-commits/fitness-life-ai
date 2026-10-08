import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { spacing, useColors } from '../lib/theme';
import { Button, Card, ErrorBanner, Field, T } from '../components/ui';

export default function LoginScreen() {
  const { login } = useAuth();
  const c = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e = email, p = password) => {
    setBusy(true);
    setError(null);
    try {
      await login(e, p);
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
          <T variant="title">Bienvenido de nuevo</T>
          <T color={c.textMuted}>Inicia sesión para pujar y vender.</T>
        </View>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={() => submit()} />
        {error ? <ErrorBanner message={error} /> : null}
        <Button title="Iniciar sesión" size="lg" loading={busy} onPress={() => submit()} />
        <Pressable onPress={() => router.replace('/register')} style={{ alignItems: 'center', padding: spacing.sm }}>
          <T color={c.textMuted}>¿No tienes cuenta? <T color={c.primary} style={{ fontWeight: '700' }}>Regístrate</T></T>
        </Pressable>

        <Card style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          <T variant="h3">Cuentas de demostración</T>
          <T variant="small" color={c.textMuted}>Contraseña: subastia123</T>
          {['ana@demo.com', 'luis@demo.com', 'marta@demo.com'].map((demo) => (
            <Button key={demo} title={`Entrar como ${demo}`} variant="secondary" size="sm" onPress={() => submit(demo, 'subastia123')} />
          ))}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
