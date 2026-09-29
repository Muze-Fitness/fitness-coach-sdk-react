import type { ZingTheme } from '../modules/zing-sdk';

// The SDK defaults are the light theme; this sample only squares the buttons.
export const lightTheme: ZingTheme = {
  cornersRounding: { button: 0 }
};

// The SDK's built-in dark palette; unset tokens keep their light defaults.
export const darkTheme: ZingTheme = {
  colors: {
    bgPrimary: '#000000',
    bgSecondary: '#000000',
    bgTertiary: '#394052',
    bgAccentLayer: '#FFFFFF29',
    borderPrimary: '#FFFFFF1F',
    borderGloss: '#FFFFFF29',
    brandText: '#95A6FF',
    buttonPrimary: '#FFFFFF',
    buttonSecondary: '#FFFFFF29',
    cardBgPrimary: '#1D212C',
    cardBgSecondary: '#1D212C',
    cvBgBodyScan: '#8C25F4',
    cvBgFitnessTest: '#B68300',
    fgPrimary: '#FFFFFF',
    fgSecondary: '#A3ABC3',
    fgPrimaryInv: '#000000',
    fgRed: '#C02640',
    headingPrimary: '#FFFFFF',
    headingPrimaryInv: '#000000',
    overlayCardAccent: '#FFFFFF66',
    overlayCardDefault: '#100D2966'
  },
  cornersRounding: { button: 0 },
  blurStyle: 'systemMaterialDark'
};
