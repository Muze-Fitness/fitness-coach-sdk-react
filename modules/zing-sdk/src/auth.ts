import { useEventListener } from 'expo';
import { useSyncExternalStore } from 'react';
import { ready } from './initialize';
import type { ZingAuthentication, ZingAuthState, ZingCriticalError } from './types';
import ZingSdk from './ZingSdkModule';

/** Call only while the auth status is `loggedOut`; `initialize` restores a saved session on its own. */
export async function login(authentication: ZingAuthentication) {
  await ready();
  return ZingSdk.login(authentication);
}

export async function logout() {
  await ready();
  return ZingSdk.logout();
}

let authState: ZingAuthState | null = null;
ZingSdk.addListener('onAuthStateChanged', (state) => {
  authState = state;
});

function subscribeToAuthState(onChange: () => void) {
  const subscription = ZingSdk.addListener('onAuthStateChanged', onChange);
  return () => subscription.remove();
}

/** `null` until `initialize` completes. */
export function useAuthState() {
  return useSyncExternalStore(subscribeToAuthState, () => authState);
}

/** For code outside React components; call `.remove()` on the result to unsubscribe. */
export function addCriticalErrorListener(listener: (error: ZingCriticalError) => void) {
  return ZingSdk.addListener('onCriticalError', listener);
}

/** Calls the latest `listener` for every critical error while the component is mounted. */
export function useCriticalErrorListener(listener: (error: ZingCriticalError) => void) {
  useEventListener(ZingSdk, 'onCriticalError', listener);
}
