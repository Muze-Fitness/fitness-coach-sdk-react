import { ready } from './initialize';
import { toNativeTheme, type ZingTheme } from './theme';
import ZingSdk from './ZingSdkModule';

let revision = 0;
const listeners = new Set<() => void>();

/**
 * Replaces the whole theme; omitted tokens revert to SDK defaults. Mounted `ZingHomeView`s update.
 * On iOS, a screen already opened with `openScreen` keeps the previous theme until it is reopened.
 */
export async function setTheme(theme: ZingTheme) {
  const nativeTheme = toNativeTheme(theme);
  await ready();
  await ZingSdk.setTheme(nativeTheme);
  revision++;
  listeners.forEach((listener) => listener());
}

export function subscribeToTheme(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getThemeRevision() {
  return revision;
}
