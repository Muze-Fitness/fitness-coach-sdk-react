import { ready } from './initialize';
import type { ZingProfileParams } from './types';
import ZingSdk from './ZingSdkModule';

/** Requires a logged-in user. */
export async function setProfileParams(params: ZingProfileParams) {
  await ready();
  return ZingSdk.setProfileParams(params);
}

/** Saves your ID for the user's primary location to their profile. Requires a logged-in user. */
export async function setPrimaryLocationId(id: string) {
  await ready();
  return ZingSdk.setPrimaryLocationId(id);
}
