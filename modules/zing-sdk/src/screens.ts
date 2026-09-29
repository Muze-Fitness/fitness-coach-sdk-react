import { ready } from './initialize';
import type { ZingHomeScreenConfiguration, ZingRoute } from './types';
import ZingSdk from './ZingSdkModule';

/** Presents a full-screen SDK screen over the app. Until the user completes onboarding, every route opens onboarding. */
export function openScreen(route: 'home', options?: ZingHomeScreenConfiguration): Promise<void>;
export function openScreen(route: ZingRoute): Promise<void>;
export async function openScreen(route: ZingRoute, options: ZingHomeScreenConfiguration = {}) {
  await ready();
  return ZingSdk.openScreen(route, options);
}
