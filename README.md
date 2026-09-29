# Zing Coach SDK — React Native sample

## Setup

Requires Node 20.19.4+, Xcode 16+, Android Studio with SDK 36, JDK 21.

1. `npm install`
2. `cp constants/ZingApiKeys.example.ts constants/ZingApiKeys.ts` and fill in `ios` / `android` keys.
3. `npx expo prebuild`
4. Add Android maven credentials (GitHub Packages, `read:packages` scope) to `android/local.properties`; re-add them after `npx expo prebuild --clean`.
   ```
   sdk_maven_read_username=<github-username>
   sdk_maven_read_token=<github-token>
   ```
5. `npx expo run:ios` or `npx expo run:android`.

## Integration

Copy `modules/zing-sdk` into your app. From `app.json`, merge the `expo-build-properties` and `./modules/zing-sdk/app.plugin.js` plugins, `ios.infoPlist`, and `ios.entitlements`.

## Usage

### Initialization

Call once at module scope, before the first render, as `app/_layout.tsx` does.

```ts
import { lightTheme } from './constants/ZingThemes';
import { initialize } from './modules/zing-sdk';

initialize({
  configuration: {
    coachesAvailability: 'allCoaches',
    genderAvailability: 'all',
    healthBackgroundSync: false,
  },
  theme: lightTheme,
}).catch(console.error);
```

- Repeat calls return the first call's promise.
- SDK calls made while it is pending wait for it. If it rejects, they reject with the same error.

### Theme

Pass a theme to `initialize`, or swap it at runtime with `setTheme`. Each call replaces the whole theme: omitted tokens revert to SDK defaults.

```tsx
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { lightTheme } from './constants/ZingThemes';
import { setTheme, type ZingTheme } from './modules/zing-sdk';

const darkTheme: ZingTheme = {
  // Any color string `processColor` accepts; invalid values throw.
  colors: { bgPrimary: '#000000', fgPrimary: '#FFFFFF', headingPrimary: '#FFFFFF' },
  // Points or 'pill'. Android applies only `button`.
  cornersRounding: { button: 'pill' },
  // Android: `res/font/` resource name. iOS: PostScript name of a registered font; unknown names keep the default.
  typography: Platform.select({
    ios: { system: 'Inter-Regular', brand: 'Display-Bold' },
    android: { system: 'inter', brand: 'display' },
  }),
  // iOS only: 'systemMaterialLight' (default) or 'systemMaterialDark'. Pair it with `fgPrimary` and `headingPrimary`.
  blurStyle: 'systemMaterialDark',
};

// Call from your root component to follow the system appearance.
export function useZingSystemTheme() {
  const scheme = useColorScheme();
  useEffect(() => {
    setTheme(scheme === 'dark' ? darkTheme : lightTheme).catch(console.error);
  }, [scheme]);
}
```

- Color and radius keys marked `@platform ios` in `ZingTheme` are ignored on Android.
- `constants/ZingThemes.ts` has a dark theme to start from.
- On iOS, a screen already opened with `openScreen` keeps the previous theme until it is reopened.
- On Android, theme images come from the app's drawables when present: `zing_plan_background`, `zing_coach_john`, `zing_coach_jennifer`, `zing_coach_sarah`, `zing_coach_chris`.

### Authentication

The SDK restores a saved session during `initialize`; call `login` only while the status is `loggedOut`.

```tsx
import { Button, Platform } from 'react-native';
import { ZING_API_KEYS } from './constants/ZingApiKeys';
import { login, logout, useAuthState, useCriticalErrorListener } from './modules/zing-sdk';

export function AuthButton() {
  // `null` until `initialize` completes.
  const authState = useAuthState();

  // `authError`: the session expired; log the user in again.
  useCriticalErrorListener(({ code }) => {
    if (code === 'authError') console.warn('Zing session expired');
  });

  if (authState?.status === 'loggedIn') {
    return <Button title="Logout" onPress={() => logout().catch(console.error)} />;
  }

  return (
    <Button
      title="Login"
      disabled={authState?.status !== 'loggedOut'}
      onPress={() =>
        login({
          apiKey: Platform.OS === 'ios' ? ZING_API_KEYS.ios : ZING_API_KEYS.android,
          // Becomes `authState.userId`; omit it to let the SDK generate one.
          partnerUserId: 'user-42',
        }).catch(console.error)
      }
    />
  );
}
```

- To log in with a JWT from your backend, call `login({ externalToken })`; its `sub` claim becomes `userId`.
- Outside components, use `addCriticalErrorListener` and call `.remove()` on the result to unsubscribe.

### Screens and profile

Until the user completes onboarding, every route opens onboarding. Setting `name` and `gender` with `setProfileParams` skips their onboarding screens.

```tsx
import { openScreen, setPrimaryLocationId, setProfileParams, ZingHomeView } from './modules/zing-sdk';

await openScreen('bodyScan');
// Options apply only to 'home'.
await openScreen('home', { showCloseButton: false, showBodyScanWidget: false });

// Both require a logged-in user. Height is in cm and weight in kg for either `measurementSystem`.
await setProfileParams({ name: 'Alex', gender: 'female', height: 170, weight: 62, age: 30, measurementSystem: 'metric' });
await setPrimaryLocationId('location-1');

// In a component. Renders nothing until a user is logged in.
<ZingHomeView style={{ flex: 1 }} showBodyScanWidget={false} />
```

On iOS, changing `ZingHomeView` props or calling `setTheme` remounts the view, resetting its scroll position.

### Errors

SDK calls reject with an `Error` whose `code` is one of:

- `ERR_NOT_INITIALIZED`: `initialize` was not called.
- `ERR_NO_PRESENTER`: `openScreen` found no screen to present from.
- `ERR_UNKNOWN_ROUTE`: `openScreen` got a route outside `ZingRoute`.
- `ERR_INVALID_AUTHENTICATION`: `login` got neither `apiKey` nor `externalToken`.

Invalid theme colors throw a `TypeError`. Other failures carry the native SDK's message.
