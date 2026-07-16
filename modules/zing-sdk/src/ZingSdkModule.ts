import { NativeModule, requireNativeModule } from 'expo';

import type { NativeZingInitArgs, ZingRoute, ZingSdkModuleEvents } from './ZingSdk.types';

declare class ZingSdkModule extends NativeModule<ZingSdkModuleEvents> {
  initialize(args: NativeZingInitArgs): Promise<void>;
  login(): Promise<void>;
  logout(): Promise<void>;
  openScreen(route: ZingRoute): Promise<void>;
  provideAuthToken(requestId: string, token: string): void;
  rejectAuthToken(requestId: string, message: string): void;
}

export default requireNativeModule<ZingSdkModule>('ZingSdk');
