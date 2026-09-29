import { NativeModule, requireNativeModule } from 'expo';
import type {
  ZingAuthentication,
  ZingAuthState,
  ZingConfiguration,
  ZingCriticalError,
  ZingHomeScreenConfiguration,
  ZingProfileParams,
  ZingRoute,
} from './types';

export type NativeRadius = { type: 'pill' } | { type: 'value'; value: number };

export type NativeTheme = {
  /** Unsigned ARGB integers, keyed by design token. */
  colors: Record<string, number>;
  cornersRounding: Record<string, NativeRadius>;
  typography?: { system?: string; brand?: string };
  blurStyle?: string;
};

declare class ZingSdkModule extends NativeModule<{
  onAuthStateChanged: (state: ZingAuthState) => void;
  onCriticalError: (error: ZingCriticalError) => void;
}> {
  initialize(args: { configuration?: ZingConfiguration; theme?: NativeTheme }): Promise<void>;
  login(authentication: ZingAuthentication): Promise<void>;
  logout(): Promise<void>;
  setTheme(theme: NativeTheme): Promise<void>;
  openScreen(route: ZingRoute, home: ZingHomeScreenConfiguration): Promise<void>;
  setProfileParams(params: ZingProfileParams): Promise<void>;
  setPrimaryLocationId(id: string): Promise<void>;
}

export default requireNativeModule<ZingSdkModule>('ZingSdk');
