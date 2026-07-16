import type { ColorValue } from 'react-native';

export type ZingAuthState = 'loggedOut' | 'inProgress' | 'authenticated';

export type ZingRoute =
  | 'home'
  | 'custom_workout'
  | 'ai_assistant'
  | 'workout_plan_details'
  | 'full_schedule'
  | 'profile_settings'
  | 'body_scan'
  | 'flexibility_test'
  | 'fitness_test';

export type ZingPlatformValue<T> = T | { ios?: T; android?: T };

export type ZingApiKeyAuth = {
  ios: string;
  android: string;
};

/**
 * External token authentication. The native SDK calls back into JS to obtain
 * and refresh tokens managed by the host application.
 */
export type ZingExternalTokenAuth = {
  getAuthToken: () => Promise<string>;
  onTokenInvalid: () => void;
};

export type ZingAuthentication =
  | { apiKey: ZingApiKeyAuth }
  | { externalToken: ZingExternalTokenAuth };

export type ZingCoachesAvailability = 'allCoaches' | 'userGenderBased';

export type ZingGenderAvailability = 'all' | 'binary';

export type ZingConfiguration = {
  /** Defaults to 'allCoaches'. */
  coachesAvailability?: ZingCoachesAvailability;
  /** Defaults to 'all'. */
  genderAvailability?: ZingGenderAvailability;
  /**
   * Enables background sync of health data (Health Connect on Android,
   * HealthKit background delivery on iOS). Defaults to false.
   *
   * Note: launching the app in the background without an Activity (Android
   * headless background sync) is not yet supported by this wrapper.
   */
  healthBackgroundSync?: boolean;
};

export type ZingRadius = { type: 'value'; value: number } | { type: 'pill' };

export type ZingThemeColors = {
  brandPrimary?: ColorValue;
  brandSecondary?: ColorValue;
  textHeadingDarkPrimary?: ColorValue;
  textHeadingLightPrimary?: ColorValue;
  textBodyDarkPrimary?: ColorValue;
  textBodyDarkSecondary?: ColorValue;
  buttonPrimary?: ColorValue;
  buttonSecondary?: ColorValue;
  bgPrimary?: ColorValue;
  bgSecondary?: ColorValue;
};

/**
 * Font names: on Android a `res/font/` resource name, on iOS a registered
 * font family name. Pass `{ ios, android }` when the names differ.
 */
export type ZingThemeTypography = {
  /** Body/UI font. */
  system?: ZingPlatformValue<string>;
  /** Display/heading font. */
  brand?: ZingPlatformValue<string>;
};

/**
 * Optional branding overrides applied to the SDK at initialization.
 * Any field left unset falls back to the SDK's built-in defaults.
 */
export type ZingTheme = {
  colors?: ZingThemeColors;
  cornersRounding?: { buttonBorder?: ZingRadius };
  typography?: ZingThemeTypography;
};

export type ZingInitializeOptions = {
  authentication: ZingAuthentication;
  configuration?: ZingConfiguration;
  theme?: ZingTheme;
};

export type ZingAuthStateEvent = {
  state: ZingAuthState;
};

export type ZingAuthTokenRequestEvent = {
  requestId: string;
};

export type ZingSdkModuleEvents = {
  onAuthStateChanged: (event: ZingAuthStateEvent) => void;
  onAuthTokenRequested: (event: ZingAuthTokenRequestEvent) => void;
  onTokenInvalid: () => void;
};

/**
 * Arguments sent to the native `initialize` function. Mirrors the wire format
 * of the Flutter wrapper's `init` method channel call so the native
 * implementations stay in sync across both wrappers.
 */
export type NativeZingInitArgs = {
  type: 'apiKey' | 'externalToken';
  apiKey?: string;
  configuration?: {
    coachesAvailability: ZingCoachesAvailability;
    genderAvailability: ZingGenderAvailability;
    healthBackgroundSync: boolean;
  };
  theme?: {
    /** Keys like 'brand/primary'; values are unsigned ARGB32 ints. */
    colors?: Record<string, number>;
    cornersRounding?: { 'button/border': ZingRadius };
    /** Font names already resolved for the current platform. */
    typography?: { system?: string; brand?: string };
  };
};
