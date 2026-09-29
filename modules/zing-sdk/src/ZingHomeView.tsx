import { requireNativeView } from 'expo';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { useAuthState } from './auth';
import { getThemeRevision, subscribeToTheme } from './themeStore';
import type { ZingHomeViewProps } from './types';

const NativeZingHomeView = requireNativeView<ZingHomeViewProps>('ZingSdk');

/** Embedded SDK home screen. Renders nothing unless a user is logged in; size it with `flex: 1`. */
export function ZingHomeView(props: ZingHomeViewProps) {
  const loggedIn = useAuthState()?.status === 'loggedIn';
  const themeRevision = useSyncExternalStore(subscribeToTheme, getThemeRevision);
  if (!loggedIn) return null;
  // iOS builds the SDK screen once, so a new key remounts it with the current options and theme.
  const key =
    Platform.OS === 'ios'
      ? [props.showCloseButton, props.showAskCoachButton, props.showBodyScanWidget, themeRevision].join()
      : undefined;
  return <NativeZingHomeView key={key} {...props} />;
}
