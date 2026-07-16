import type { EventSubscription } from 'expo-modules-core';
import { Platform, processColor } from 'react-native';

import ZingSdkModule from './src/ZingSdkModule';
import type {
  NativeZingInitArgs,
  ZingAuthState,
  ZingAuthStateEvent,
  ZingAuthTokenRequestEvent,
  ZingExternalTokenAuth,
  ZingInitializeOptions,
  ZingPlatformValue,
  ZingRoute,
  ZingTheme,
  ZingThemeColors,
} from './src/ZingSdk.types';

export type {
  ZingAuthState,
  ZingAuthStateEvent,
  ZingAuthentication,
  ZingApiKeyAuth,
  ZingExternalTokenAuth,
  ZingConfiguration,
  ZingCoachesAvailability,
  ZingGenderAvailability,
  ZingInitializeOptions,
  ZingPlatformValue,
  ZingRadius,
  ZingRoute,
  ZingTheme,
  ZingThemeColors,
  ZingThemeTypography,
} from './src/ZingSdk.types';

const COLOR_TOKEN_KEYS: Record<keyof ZingThemeColors, string> = {
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
};

function buildNativeTheme(theme: ZingTheme): NativeZingInitArgs['theme'] {
  const result: NonNullable<NativeZingInitArgs['theme']> = {};

  if (theme.colors) {
    const colors: Record<string, number> = {};
    for (const [field, tokenKey] of Object.entries(COLOR_TOKEN_KEYS)) {
      const value = theme.colors[field as keyof ZingThemeColors];
      if (value == null) continue;
      const processed = processColor(value);
      if (typeof processed !== 'number') {
        throw new Error(`Invalid color for theme.colors.${field}: ${String(value)}`);
      }
      // Normalize to unsigned ARGB32, matching Flutter's Color.toARGB32().
      colors[tokenKey] = processed >>> 0;
    }
    if (Object.keys(colors).length > 0) result.colors = colors;
  }

  if (theme.cornersRounding?.buttonBorder) {
    result.cornersRounding = { 'button/border': theme.cornersRounding.buttonBorder };
  }

  const system = resolveFontName(theme.typography?.system);
  const brand = resolveFontName(theme.typography?.brand);
  if (system != null || brand != null) {
    result.typography = {
      ...(system != null && { system }),
      ...(brand != null && { brand }),
    };
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function resolveFontName(value: ZingPlatformValue<string> | undefined): string | undefined {
  if (value == null || typeof value === 'string') return value ?? undefined;
  return Platform.OS === 'ios' ? value.ios : value.android;
}

function buildNativeInitArgs(options: ZingInitializeOptions): NativeZingInitArgs {
  const args: NativeZingInitArgs = { type: 'apiKey' };

  if ('apiKey' in options.authentication) {
    const { ios, android } = options.authentication.apiKey;
    args.type = 'apiKey';
    args.apiKey = Platform.OS === 'ios' ? ios : android;
  } else {
    args.type = 'externalToken';
  }

  if (options.configuration) {
    args.configuration = {
      coachesAvailability: options.configuration.coachesAvailability ?? 'allCoaches',
      genderAvailability: options.configuration.genderAvailability ?? 'all',
      healthBackgroundSync: options.configuration.healthBackgroundSync ?? false,
    };
  }

  if (options.theme) {
    args.theme = buildNativeTheme(options.theme);
  }

  return args;
}

let tokenBridgeSubscriptions: EventSubscription[] = [];

function attachTokenBridge(callbacks: ZingExternalTokenAuth): void {
  tokenBridgeSubscriptions.forEach((subscription) => subscription.remove());
  tokenBridgeSubscriptions = [
    ZingSdkModule.addListener(
      'onAuthTokenRequested',
      async ({ requestId }: ZingAuthTokenRequestEvent) => {
        try {
          const token = await callbacks.getAuthToken();
          ZingSdkModule.provideAuthToken(requestId, token);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          ZingSdkModule.rejectAuthToken(requestId, message);
        }
      }
    ),
    ZingSdkModule.addListener('onTokenInvalid', () => callbacks.onTokenInvalid()),
  ];
}

let initializePromise: Promise<void> | null = null;

async function runInitialize(options: ZingInitializeOptions): Promise<void> {
  const args = buildNativeInitArgs(options);
  if ('externalToken' in options.authentication) {
    attachTokenBridge(options.authentication.externalToken);
  }
  await ZingSdkModule.initialize(args);
}

/**
 * Repeated calls return the result of the first initialization; after a
 * failure, the next call retries.
 */
export function initialize(options: ZingInitializeOptions): Promise<void> {
  if (!initializePromise) {
    initializePromise = runInitialize(options).catch((error: unknown) => {
      initializePromise = null;
      throw error;
    });
  }
  return initializePromise;
}

export function login(): Promise<void> {
  return ZingSdkModule.login();
}

export function logout(): Promise<void> {
  return ZingSdkModule.logout();
}

export function openScreen(route: ZingRoute): Promise<void> {
  return ZingSdkModule.openScreen(route);
}

export function addAuthStateListener(
  listener: (state: ZingAuthState) => void
): EventSubscription {
  return ZingSdkModule.addListener('onAuthStateChanged', (event: ZingAuthStateEvent) => {
    listener(event.state);
  });
}

export default ZingSdkModule;
