import { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  addAuthStateListener,
  initialize,
  login,
  logout,
  openScreen,
  type ZingAuthState,
  type ZingRoute,
} from '../modules/zing-sdk';
import { ZING_API_KEYS } from '../constants/ZingApiKeys';

const MODULES: { route: ZingRoute; label: string }[] = [
  { route: 'home', label: 'Program' },
  { route: 'custom_workout', label: 'Custom Workout' },
  { route: 'ai_assistant', label: 'AI Coach' },
  { route: 'full_schedule', label: 'Full Schedule' },
  { route: 'profile_settings', label: 'Profile Settings' },
];

export default function Home() {
  const [authState, setAuthState] = useState<ZingAuthState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const subscription = addAuthStateListener(setAuthState);
    initialize(ZING_API_KEYS)
      .then(() => setReady(true))
      .catch((err: Error) => setError(err.message));
    return () => subscription.remove();
  }, []);

  const run = async (fn: () => Promise<void>, label: string) => {
    try {
      await fn();
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`${label}: ${message}`);
      Alert.alert(label, message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Zing Coach SDK — React Native</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={styles.statusValue}>
            {ready ? authState ?? 'initializing' : 'initializing'}
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {MODULES.map(({ route, label }) => (
          <Pressable
            key={route}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            disabled={!ready}
            onPress={() => run(() => openScreen(route), label)}
          >
            <Text style={styles.buttonText}>{label}</Text>
          </Pressable>
        ))}

        <View style={styles.authRow}>
          <Pressable
            style={({ pressed }) => [styles.authButton, pressed && styles.buttonPressed]}
            disabled={!ready}
            onPress={() => run(login, 'Login')}
          >
            <Text style={styles.buttonText}>Login</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.authButton, pressed && styles.buttonPressed]}
            disabled={!ready}
            onPress={() => run(logout, 'Logout')}
          >
            <Text style={styles.buttonText}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statusLabel: { fontSize: 16, color: '#666' },
  statusValue: { fontSize: 16, fontWeight: '600' },
  error: { color: '#c00', marginBottom: 12 },
  button: {
    backgroundColor: '#111',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  authRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  authButton: {
    flex: 1,
    backgroundColor: '#4a6cf7',
    paddingVertical: 14,
    borderRadius: 10,
  },
});
