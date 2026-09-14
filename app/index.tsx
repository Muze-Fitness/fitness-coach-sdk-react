import { useState } from 'react';
import { Button, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ZING_API_KEYS } from '../constants/ZingApiKeys';
import { login, logout, openScreen, setProfileParams, useAuthState, type ZingRoute } from '../modules/zing-sdk';

const ROUTES = [
  ['Home', 'home'],
  ['Onboarding', 'onboarding'],
  ['Custom Workout', 'customWorkout'],
  ['AI Assistant', 'aiAssistant'],
  ['Workout Plan Details', 'workoutPlanDetails'],
  ['Full Schedule', 'fullSchedule'],
  ['Profile Settings', 'profileSettings'],
  ['Body Scan', 'bodyScan'],
  ['Flexibility Test', 'flexibilityTest'],
  ['Fitness Test', 'fitnessTest']
] as const satisfies readonly (readonly [string, ZingRoute])[];

const API_KEY = Platform.OS === 'ios'
  ? ZING_API_KEYS.ios
  : ZING_API_KEYS.android;

const LOGIN_TITLES = {
  loggedOut: 'Login',
  inProgress: 'In Progress...',
  authenticated: 'Logout'
} as const;

export default function SettingsTab() {
  const authState = useAuthState();
  const [partnerUserId, setPartnerUserId] = useState('');
  const [error, setError] = useState<string>();

  const run = async (action: () => Promise<void>) => {
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? `${'code' in e ? `${e.code}: ` : ''}${e.message}` : String(e));
    }
  };

  const state = authState?.state;

  const loginOrLogout = () =>
    state === 'authenticated'
      ? logout()
      : login({ apiKey: API_KEY, partnerUserId: partnerUserId.trim() || undefined });

  const setProfile = () =>
    setProfileParams({
      name: 'Username',
      gender: 'male',
      height: 178.9,
      weight: 67.8,
      age: 23,
      measurementSystem: 'metric'
    });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button
        title={state ? LOGIN_TITLES[state] : LOGIN_TITLES.loggedOut}
        disabled={state === 'inProgress'}
        onPress={() => run(loginOrLogout)}
      />
      {state === 'authenticated' && <Button title="Set Profile Params" onPress={() => run(setProfile)} />}
      {state === 'loggedOut' && (
        <TextInput
          placeholder="Partner ID (optional)"
          autoCapitalize="none"
          value={partnerUserId}
          onChangeText={setPartnerUserId}
          style={styles.input}
        />
      )}

      <Text style={styles.centered}>Auth state: {state ?? 'unknown'}</Text>
      {authState?.state === 'authenticated' && (
        <Text selectable style={styles.centered}>
          User ID: {authState.userId}
        </Text>
      )}
      {error && <Text style={[styles.centered, styles.error]}>{error}</Text>}

      <View style={styles.sectionGap} />
      {ROUTES.map(([title, route]) => (
        <Button key={route} title={title} onPress={() => run(() => openScreen(route))} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12 },
  centered: { textAlign: 'center' },
  error: { color: 'red' },
  sectionGap: { height: 32 }
});
