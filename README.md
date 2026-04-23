# Zing Coach SDK — React Native sample

## Setup

Requires Node 20+, Xcode 16+, Android Studio with SDK 36, JDK 21.

1. `npm install`
2. `cp constants/ZingApiKeys.example.ts constants/ZingApiKeys.ts` and fill in `iosApiKey` / `androidApiKey`.
3. `npx expo prebuild`
4. Android maven credentials (GitHub Packages, `read:packages` scope) — add to the generated `android/local.properties`:
   ```
   sdk_maven_read_username=<github-username>
   sdk_maven_read_token=<github-token>
   ```
   Or export `ZING_SDK_MAVEN_USER` / `ZING_SDK_MAVEN_TOKEN`.
5. `npx expo run:ios` or `npx expo run:android`.
