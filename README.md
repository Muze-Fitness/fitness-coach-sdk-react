# Zing Coach SDK — React Native sample

## Setup

Requires Node 20+, Xcode 16+, Android Studio with SDK 36, JDK 21.

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

Call once at startup, before any other SDK call, as `app/_layout.tsx` does.

```ts
import { initialize } from './modules/zing-sdk';

await initialize({
  configuration: {
    coachesAvailability: 'allCoaches',
    genderAvailability: 'all',
    healthBackgroundSync: false,
  },
  theme: {
    colors: { brandPrimary: '#FF5500', buttonPrimary: '#111111' },
    // Android applies only `button`.
    cornersRounding: { button: { type: 'pill' } },
    // Android: `res/font/` resource name. iOS: registered font family name.
    typography: { system: 'inter', brand: 'display' },
  },
});
```

On Android, theme images come from the app's drawables when present: `zing_plan_background`, `zing_coach_john`, `zing_coach_jennifer`, `zing_coach_sarah`, `zing_coach_chris`.

### Authentication

The SDK restores a saved session during `initialize`; call `login` only while the state is `loggedOut`.

```tsx
import { addCriticalErrorListener, login, logout, useAuthState } from './modules/zing-sdk';

// `null` until `initialize` completes.
const authState = useAuthState();

// Keys differ per platform. `partnerUserId` becomes `authState.userId`; omit it to let the SDK generate one.
await login({ apiKey: Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY, partnerUserId: 'user-42' });
// Or a JWT from your backend; `userId` is its `sub` claim.
await login({ externalToken: jwt });

// `authError`: the session could not be refreshed; log the user in again. Call `.remove()` to unsubscribe.
const subscription = addCriticalErrorListener(({ code, message }) => {});

await logout();
```

### Screens

```tsx
import { openScreen, setProfileParams, ZingHomeView } from './modules/zing-sdk';

await openScreen('bodyScan');
await openScreen('home', { showCloseButton: false });

// Requires an authenticated user. Height in cm, weight in kg; `name` and `gender` skip their onboarding screens.
await setProfileParams({ name: 'Alex', gender: 'female', height: 170, weight: 62, age: 30, measurementSystem: 'metric' });

// Render only while authenticated, at full viewport size. On iOS, props are read once.
<ZingHomeView style={{ flex: 1 }} showCloseButton={false} />
```
