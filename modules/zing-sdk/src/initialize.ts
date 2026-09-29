import { toNativeTheme, type ZingTheme } from './theme';
import type { ZingConfiguration } from './types';
import ZingSdk from './ZingSdkModule';

export type ZingInitializeOptions = { configuration?: ZingConfiguration; theme?: ZingTheme };

let initialization: Promise<void> | undefined;

/**
 * Call once at startup, at module scope, before any other SDK call.
 * Later calls return the first call's promise; use `setTheme` to change the theme.
 * If it rejects, every other SDK call rejects with the same error.
 */
export function initialize(options: ZingInitializeOptions = {}): Promise<void> {
  initialization ??= start(options);
  return initialization;
}

async function start({ configuration, theme }: ZingInitializeOptions) {
  await ZingSdk.initialize({ configuration, theme: theme && toNativeTheme(theme) });
}

/** Resolves once `initialize` completes, so calls made while it is pending wait instead of failing. */
export function ready() {
  if (!initialization) {
    throw Object.assign(new Error('Call initialize() before using the Zing SDK'), { code: 'ERR_NOT_INITIALIZED' });
  }
  return initialization;
}
