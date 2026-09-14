import { NativeModule, requireNativeModule, requireNativeView } from 'expo';
import { useSyncExternalStore } from 'react';
import { processColor, type ColorValue, type ViewProps } from 'react-native';

export type ZingAuthState =
  | { state: 'loggedOut' }
  | { state: 'inProgress' }
  | { state: 'authenticated'; userId: string };

export type ZingCriticalError = { code: 'authError' | 'unknown'; message: string };

export type ZingRoute =
  | 'home'
  | 'onboarding'
  | 'customWorkout'
  | 'aiAssistant'
  | 'workoutPlanDetails'
  | 'fullSchedule'
  | 'profileSettings'
  | 'bodyScan'
  | 'flexibilityTest'
  | 'fitnessTest';

export type ZingAuthentication = { apiKey: string; partnerUserId?: string } | { externalToken: string };

export type ZingConfiguration = {
  coachesAvailability?: 'allCoaches' | 'userGenderBased';
  genderAvailability?: 'all' | 'binary';
  healthBackgroundSync?: boolean;
};

export type ZingRadius = { type: 'value'; value: number } | { type: 'pill' };

const COLOR_TOKENS = {
  brandPrimary: 'brand/primary',
  brandSecondary: 'brand/secondary',
  textHeadingDarkPrimary: 'text/heading/dark-primary',
  textHeadingLightPrimary: 'text/heading/light-primary',
  textBodyDarkPrimary: 'text/body/dark-primary',
  textBodyDarkSecondary: 'text/body/dark-secondary',
  buttonPrimary: 'button/primary',
  buttonSecondary: 'button/secondary',
  bgPrimary: 'bg/primary',
  bgSecondary: 'bg/secondary',
} as const satisfies Record<string, string>;

const RADIUS_TOKENS = {
  button: 'radius/button',
  input: 'radius/input',
  hero: 'radius/hero',
  modal: 'radius/modal',
  cardSm: 'radius/card-sm',
  cardMd: 'radius/card-md',
  cardLg: 'radius/card-lg',
} as const satisfies Record<string, string>;

export type ZingTheme = {
  colors?: Partial<Record<keyof typeof COLOR_TOKENS, ColorValue>>;
  cornersRounding?: Partial<Record<keyof typeof RADIUS_TOKENS, ZingRadius>>;
  typography?: { system?: string; brand?: string };
};

export type ZingHomeScreenConfiguration = { showCloseButton?: boolean; showAskCoachButton?: boolean };

export type ZingProfileParams = {
  name?: string;
  gender?: 'male' | 'female' | 'other' | 'preferNotToSay';
  height?: number;
  weight?: number;
  age?: number;
  measurementSystem?: 'metric' | 'imperial';
};

type NativeTheme = {
  colors?: Record<string, number>;
  cornersRounding?: Record<string, ZingRadius>;
  typography?: { system?: string; brand?: string };
};

type NativeInitializeArgs = {
  configuration?: Required<ZingConfiguration>;
  theme?: NativeTheme;
};

type NativeLoginArgs = { jwtToken?: string; apiKey?: string; partnerUserId?: string };

declare class ZingSdkModule extends NativeModule<{
  onAuthStateChanged: (state: ZingAuthState) => void;
  onCriticalError: (error: ZingCriticalError) => void;
}> {
  initialize(args: NativeInitializeArgs): Promise<void>;
  login(args: NativeLoginArgs): Promise<void>;
  logout(): Promise<void>;
  openScreen(route: ZingRoute, home: ZingHomeScreenConfiguration): Promise<void>;
  setProfileParams(params: ZingProfileParams): Promise<void>;
}

const ZingSdk = requireNativeModule<ZingSdkModule>('ZingSdk');

function compact<T extends object>(values: T): Partial<T> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value != null)) as Partial<T>;
}

function toTokens<K extends string, V, R>(
  values: Partial<Record<K, V>>,
  tokens: Record<K, string>,
  convert: (value: V) => R
): Record<string, R> {
  return Object.fromEntries(
    Object.entries(compact(values)).map(([field, value]) => [tokens[field as K], convert(value as V)])
  );
}

export function initialize({ configuration, theme }: { configuration?: ZingConfiguration; theme?: ZingTheme } = {}) {
  return ZingSdk.initialize(
    compact<NativeInitializeArgs>({
      configuration: configuration && {
        coachesAvailability: configuration.coachesAvailability ?? 'allCoaches',
        genderAvailability: configuration.genderAvailability ?? 'all',
        healthBackgroundSync: configuration.healthBackgroundSync ?? false,
      },
      theme:
        theme &&
        compact<NativeTheme>({
          colors: theme.colors && toTokens(theme.colors, COLOR_TOKENS, (color) => (processColor(color) as number) >>> 0),
          cornersRounding: theme.cornersRounding && toTokens(theme.cornersRounding, RADIUS_TOKENS, (radius) => radius),
          typography: theme.typography && compact(theme.typography),
        }),
    })
  );
}

export function login(authentication: ZingAuthentication) {
  return ZingSdk.login(
    'externalToken' in authentication
      ? { jwtToken: authentication.externalToken }
      : compact<NativeLoginArgs>(authentication)
  );
}

export function logout() {
  return ZingSdk.logout();
}

export function openScreen(route: ZingRoute, home: ZingHomeScreenConfiguration = {}) {
  return ZingSdk.openScreen(route, home);
}

export function setProfileParams(params: ZingProfileParams) {
  return ZingSdk.setProfileParams(compact(params));
}

let authState: ZingAuthState | null = null;
ZingSdk.addListener('onAuthStateChanged', (state) => {
  authState = state;
});

export function useAuthState() {
  return useSyncExternalStore(
    (onChange) => {
      const subscription = ZingSdk.addListener('onAuthStateChanged', onChange);
      return () => subscription.remove();
    },
    () => authState
  );
}

export function addCriticalErrorListener(listener: (error: ZingCriticalError) => void) {
  return ZingSdk.addListener('onCriticalError', listener);
}

export const ZingHomeView = requireNativeView<ViewProps & ZingHomeScreenConfiguration>('ZingSdk');
