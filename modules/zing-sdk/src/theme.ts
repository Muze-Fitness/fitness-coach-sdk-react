import { processColor } from 'react-native';
import type { NativeRadius, NativeTheme } from './ZingSdkModule';

/** Points, or `'pill'` for fully rounded ends. */
export type ZingRadius = number | 'pill';

/**
 * Blur behind floating icon buttons, scroll headers and the AI chat input. Defaults to `systemMaterialLight`.
 * Pair it with `fgPrimary` and `headingPrimary`: dark foreground colors on the light material, light ones on the dark.
 */
export type ZingBlurStyle = 'systemMaterialLight' | 'systemMaterialDark';

const COLOR_TOKENS = {
  bgPrimary: 'bg/primary',
  bgSecondary: 'bg/secondary',
  bgTertiary: 'bg/tertiary',
  bgLight: 'bg/light',
  bgLight8: 'bg/light-8',
  bgLight24: 'bg/light-24',
  bgLight64: 'bg/light-64',
  bgAccentLayer: 'bg/accent-layer',
  borderPrimary: 'border/primary',
  borderSecondary: 'border/secondary',
  borderGloss: 'border/gloss',
  brandPrimary: 'brand/primary',
  brandSecondary: 'brand/secondary',
  /** @platform ios */
  brandTertiary: 'brand/tertiary',
  brandText: 'brand/text',
  buttonPrimary: 'button/bg-primary',
  buttonSecondary: 'button/bg-secondary',
  /** @platform ios */
  buttonLightYellow: 'button/bg-light-yellow',
  /** @platform ios */
  buttonLightOrchid: 'button/bg-light-orchid',
  /** @platform ios */
  buttonLightBlue: 'button/bg-light-blue',
  /** @platform ios */
  buttonIconTransparent: 'button/bg-icon-transparent',
  cardBgPrimary: 'card-bg/primary',
  cardBgSecondary: 'card-bg/secondary',
  cvPrimary: 'cv/primary',
  cvBgBodyScan: 'cv/bg-body-scan',
  cvBgFitnessTest: 'cv/bg-fitness-test',
  cvBgFlexibilityTest: 'cv/bg-flexibility-test',
  fgPrimary: 'fg/primary',
  fgSecondary: 'fg/secondary',
  fgPrimaryDark: 'fg/primary-dark',
  fgPrimaryInv: 'fg/primary-inv',
  fgPrimaryLight: 'fg/primary-light',
  fgRed: 'fg/red',
  headingPrimary: 'heading/primary',
  headingPrimaryInv: 'heading/primary-inv',
  /** @platform ios */
  overlayBlackDark: 'overlay/black-dark',
  /** @platform ios */
  overlayBlackMedium: 'overlay/black-medium',
  /** @platform ios */
  overlayCadetMedium: 'overlay/cadet-medium',
  overlayCardAccent: 'overlay/card/accent',
  overlayCardDefault: 'overlay/card/default',
  /** @platform ios */
  textBodyLightPrimary: 'text/body/light-primary',
  /** @platform ios */
  textBodyLightSecondary: 'text/body/light-secondary',
  /** @platform ios */
  textBodyBluePrimary: 'text/body/blue-primary',
  /** @platform ios */
  textBodyBlueSecondary: 'text/body/blue-secondary',
  /** @platform ios */
  textBodyYellowPrimary: 'text/body/yellow-primary',
  /** @platform ios */
  textBodyOrchidPrimary: 'text/body/orchid-primary',
} as const;

const RADIUS_TOKENS = {
  button: 'radius/button',
  /** @platform ios */
  input: 'radius/input',
  /** @platform ios */
  hero: 'radius/hero',
  /** @platform ios */
  modal: 'radius/modal',
  /** @platform ios */
  cardSm: 'radius/card-sm',
  /** @platform ios */
  cardMd: 'radius/card-md',
  /** @platform ios */
  cardLg: 'radius/card-lg',
} as const;

// Homomorphic over `keyof T`, so each key keeps its JSDoc (`@platform ios`) on hover.
type Tokens<T, V> = { -readonly [K in keyof T]?: V };

export type ZingTheme = {
  /** `#RRGGBB`, `#RRGGBBAA`, `rgb()`, `hsl()` or a CSS color name. */
  colors?: Tokens<typeof COLOR_TOKENS, string>;
  cornersRounding?: Tokens<typeof RADIUS_TOKENS, ZingRadius>;
  /** Android: `res/font` resource name. iOS: PostScript name of a registered font, e.g. `Inter-Regular`. */
  typography?: { system?: string; brand?: string };
  /** @platform ios */
  blurStyle?: ZingBlurStyle;
};

function toTokens<V, R>(
  values: Partial<Record<string, V>>,
  tokens: Record<string, string>,
  convert: (value: V) => R
): Record<string, R> {
  return Object.fromEntries(
    Object.entries(values).flatMap(([field, value]) => (value == null ? [] : [[tokens[field], convert(value)] as const]))
  );
}

function toArgb(color: string) {
  const argb = processColor(color);
  if (typeof argb !== 'number') {
    throw new TypeError(`Invalid Zing theme color: ${color}`);
  }
  return argb >>> 0;
}

function toNativeRadius(radius: ZingRadius): NativeRadius {
  return radius === 'pill' ? { type: 'pill' } : { type: 'value', value: radius };
}

export function toNativeTheme({ colors = {}, cornersRounding = {}, typography, blurStyle }: ZingTheme): NativeTheme {
  return {
    colors: toTokens(colors, COLOR_TOKENS, toArgb),
    cornersRounding: toTokens(cornersRounding, RADIUS_TOKENS, toNativeRadius),
    typography,
    blurStyle,
  };
}
