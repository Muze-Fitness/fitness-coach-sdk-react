import { useState } from 'react';
import { Button, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ZING_API_KEYS } from '../constants/ZingApiKeys';
import { darkTheme, lightTheme } from '../constants/ZingThemes';
import {
  login,
  logout,
  openScreen,
  setPrimaryLocationId,
  setProfileParams,
  setTheme,
  useAuthState,
  useCriticalErrorListener,
  type ZingRoute
} from '../modules/zing-sdk';

const ROUTE_TITLES = {
  home: 'Home',
  onboarding: 'Onboarding',
  customWorkout: 'Custom Workout',
  aiAssistant: 'AI Assistant',
  workoutPlanDetails: 'Workout Plan Details',
  fullSchedule: 'Full Schedule',
  profileSettings: 'Profile Settings',
  bodyScan: 'Body Scan',
  flexibilityTest: 'Flexibility Test',
  fitnessTest: 'Fitness Test'
} satisfies Record<ZingRoute, string>;

const API_KEY = Platform.OS === 'ios'
  ? ZING_API_KEYS.ios
  : ZING_API_KEYS.android;

const LOGIN_TITLES = {
  loggedOut: 'Login',
  inProgress: 'In Progress...',
  loggedIn: 'Logout'
} as const;

export default function SettingsTab() {
  const authState = useAuthState();
  const [partnerUserId, setPartnerUserId] = useState('');
  const [error, setError] = useState<string>();
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [primaryLocationId, setPrimaryLocationIdInput] = useState('');

  useCriticalErrorListener(({ code, message }) =>
    setError(code === 'authError' ? 'Session expired, log in again' : message)
  );

  const run = async (action: () => Promise<void>) => {
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? `${'code' in e ? `${e.code}: ` : ''}${e.message}` : String(e));
    }
  };

  // `undefined` while `initialize` restores a saved session.
  const status = authState?.status;

  const loginOrLogout = () =>
    status === 'loggedIn'
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

  const toggleTheme = (dark: boolean) =>
    run(async () => {
      await setTheme(dark ? darkTheme : lightTheme);
      setIsDarkTheme(dark);
    });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.row}>
        <Text>Dark theme</Text>
        <Switch value={isDarkTheme} onValueChange={toggleTheme} />
      </View>
      <Button
        title={LOGIN_TITLES[status ?? 'inProgress']}
        disabled={status !== 'loggedOut' && status !== 'loggedIn'}
        onPress={() => run(loginOrLogout)}
      />
      {status === 'loggedOut' && (
        <TextInput
          placeholder="Partner user ID (optional)"
          autoCapitalize="none"
          value={partnerUserId}
          onChangeText={setPartnerUserId}
          style={styles.input}
        />
      )}
      {status === 'loggedIn' && (
        <>
          <Button title="Set Profile Params" onPress={() => run(setProfile)} />
          <TextInput
            placeholder="Primary location ID"
            autoCapitalize="none"
            value={primaryLocationId}
            onChangeText={setPrimaryLocationIdInput}
            style={styles.input}
          />
          <Button
            title="Set Primary Location ID"
            disabled={!primaryLocationId.trim()}
            onPress={() => run(() => setPrimaryLocationId(primaryLocationId.trim()))}
          />
        </>
      )}

      <Text style={styles.centered}>Auth status: {status ?? 'unknown'}</Text>
      {authState?.status === 'loggedIn' && (
        <Text selectable style={styles.centered}>
          User ID: {authState.userId}
        </Text>
      )}
      {error && <Text style={[styles.centered, styles.error]}>{error}</Text>}

      {status === 'loggedIn' && (
        <>
          <View style={styles.sectionGap} />
          {(Object.entries(ROUTE_TITLES) as [ZingRoute, string][]).map(([route, title]) => (
            <Button key={route} title={title} onPress={() => run(() => openScreen(route))} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12 },
  centered: { textAlign: 'center' },
  error: { color: 'red' },
  sectionGap: { height: 32 }
});
