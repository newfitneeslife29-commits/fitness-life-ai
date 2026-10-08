import { View } from 'react-native';
import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { RealtimeProvider } from '../lib/realtime';
import { useColors, useIsDark } from '../lib/theme';
import { NotificationToast } from '../components/Toast';
import { Loading } from '../components/ui';

function RootStack() {
  const { ready } = useAuth();
  const c = useColors();
  const dark = useIsDark();
  const base = dark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, background: c.background, card: c.surface, text: c.text, border: c.border, primary: c.primary },
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Loading />
      </View>
    );
  }

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: c.background },
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auction/[id]" options={{ title: '', headerTransparent: true }} />
        <Stack.Screen name="order/[id]" options={{ title: 'Pedido' }} />
        <Stack.Screen name="user/[id]" options={{ title: 'Perfil' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notificaciones' }} />
        <Stack.Screen name="selling" options={{ title: 'Mis ventas' }} />
        <Stack.Screen name="orders" options={{ title: 'Pedidos' }} />
        <Stack.Screen name="login" options={{ presentation: 'modal', title: 'Iniciar sesión' }} />
        <Stack.Screen name="register" options={{ presentation: 'modal', title: 'Crear cuenta' }} />
      </Stack>
      <NotificationToast />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RealtimeProvider>
          <RootStack />
        </RealtimeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
