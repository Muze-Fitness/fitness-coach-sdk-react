import type { EventSubscription } from 'expo-modules-core';

import ZingSdkModule from './src/ZingSdkModule';
import type { ZingApiKeys, ZingAuthState, ZingAuthStateEvent, ZingRoute } from './src/ZingSdk.types';

export type { ZingApiKeys, ZingAuthState, ZingAuthStateEvent, ZingRoute } from './src/ZingSdk.types';

export function initialize(keys: ZingApiKeys): Promise<void> {
  return ZingSdkModule.initialize(keys);
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
