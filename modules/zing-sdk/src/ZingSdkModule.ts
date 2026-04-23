import { NativeModule, requireNativeModule } from 'expo';

import type { ZingApiKeys, ZingRoute, ZingSdkModuleEvents } from './ZingSdk.types';

declare class ZingSdkModule extends NativeModule<ZingSdkModuleEvents> {
  initialize(keys: ZingApiKeys): Promise<void>;
  login(): Promise<void>;
  logout(): Promise<void>;
  openScreen(route: ZingRoute): Promise<void>;
}

export default requireNativeModule<ZingSdkModule>('ZingSdk');
