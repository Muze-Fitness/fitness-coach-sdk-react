# Zing Coach SDK — React Native sample

Native SDK versions: iOS `zing-coach-sdk-ios` 1.8.0, Android `coach.zing:fitness-sdk` 1.5.0.

## Setup

Requires Node 20+, Xcode 16+, Android Studio with SDK 36, JDK 21.

1. `npm install`
2. `cp constants/ZingApiKeys.example.ts constants/ZingApiKeys.ts` and fill in `ios` / `android` keys.
3. `npx expo prebuild`
4. Android maven credentials (GitHub Packages, `read:packages` scope) — add to the generated `android/local.properties`:
   ```
   sdk_maven_read_username=<github-username>
   sdk_maven_read_token=<github-token>
   ```
   Or export `ZING_SDK_MAVEN_USER` / `ZING_SDK_MAVEN_TOKEN`.
5. `npx expo run:ios` or `npx expo run:android`.

## Usage

### Initialization

```ts
import { initialize } from './modules/zing-sdk';

await initialize({
  authentication: { apiKey: { ios: '...', android: '...' } },
});
```

With an external token provider instead of API keys:

```ts
await initialize({
  authentication: {
    externalToken: {
      getAuthToken: async () => fetchTokenFromYourBackend(),
      onTokenInvalid: () => {
        // Refresh or re-authenticate the user.
      },
    },
  },
});
```

### Configuration and theme (optional)

```ts
await initialize({
  authentication: { apiKey: { ios: '...', android: '...' } },
  configuration: {
    coachesAvailability: 'allCoaches', // or 'userGenderBased'
    genderAvailability: 'all',         // or 'binary'
    healthBackgroundSync: false,
  },
  theme: {
    colors: {
      brandPrimary: '#FF5500',
      buttonPrimary: '#111111',
      // brandSecondary, textHeadingDarkPrimary, textHeadingLightPrimary,
      // textBodyDarkPrimary, textBodyDarkSecondary, buttonSecondary,
      // bgPrimary, bgSecondary
    },
    cornersRounding: {
      buttonBorder: { type: 'pill' }, // or { type: 'value', value: 12 }
    },
    typography: {
      // Android res/font/ resource name, iOS registered font family name.
      // Pass one string when the name matches on both platforms, or
      // per-platform values when they differ:
      system: { android: 'inter', ios: 'Inter' },
      brand: 'display',
    },
  },
});
```

On Android, theme image assets are picked up automatically from the host app's
drawable resources when present: `zing_plan_background`, `zing_welcome_picture`,
`zing_coach_john`, `zing_coach_jennifer`, `zing_coach_sarah`, `zing_coach_chris`.

### Screens, auth

```ts
import { addAuthStateListener, login, logout, openScreen } from './modules/zing-sdk';

const subscription = addAuthStateListener((state) => {
  // 'loggedOut' | 'inProgress' | 'authenticated'
});

await login();
await openScreen('home'); // home, custom_workout, ai_assistant, workout_plan_details,
                          // full_schedule, profile_settings, body_scan,
                          // flexibility_test, fitness_test
await logout();
subscription.remove();
```
