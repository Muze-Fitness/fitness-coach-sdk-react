import type { ViewProps } from 'react-native';

export type ZingAuthState =
  | { status: 'loggedOut' }
  | { status: 'inProgress' }
  | { status: 'loggedIn'; userId: string };

/** `authError`: the session expired; log the user in again. */
export type ZingCriticalError = { code: 'authError' | 'unknown'; message: string };

/** On iOS, `workoutPlanDetails` opens `fullSchedule`. */
export type ZingRoute =
  | 'home'
  | 'onboarding'
  | 'customWorkout'
  | 'aiAssistant'
  | 'workoutPlanDetails'
  | 'fullSchedule'
  | 'profileSettings'
  | 'bodyScan'
  | 'flexibilityTest'
  | 'fitnessTest';

export type ZingAuthentication =
  | {
      /** API key from Zing; iOS and Android use different keys. */
      apiKey: string;
      /** Your ID for the user; becomes `userId` in the auth state. Omit to let the SDK generate one. */
      partnerUserId?: string;
    }
  | {
      /** JWT from your backend; its `sub` claim becomes `userId` in the auth state. */
      externalToken: string;
    };

export type ZingConfiguration = {
  /** `allCoaches` (default), or `userGenderBased`: male coaches for male users, female coaches otherwise. */
  coachesAvailability?: 'allCoaches' | 'userGenderBased';
  /** `all` (default), or `binary`: hides the `other` gender option. */
  genderAvailability?: 'all' | 'binary';
  /** Sync health data in the background: Apple Health on iOS, Health Connect on Android. Defaults to `false`. */
  healthBackgroundSync?: boolean;
};

export type ZingHomeScreenConfiguration = {
  /** Defaults to `true` in `openScreen('home')` and `false` in `ZingHomeView`. */
  showCloseButton?: boolean;
  /** Defaults to `true`. */
  showAskCoachButton?: boolean;
  /** Defaults to `true`. */
  showBodyScanWidget?: boolean;
};

export type ZingHomeViewProps = ViewProps & ZingHomeScreenConfiguration;

/** Setting `name` and `gender` skips their onboarding screens. */
export type ZingProfileParams = {
  name?: string;
  /** Android ignores `preferNotToSay`. */
  gender?: 'male' | 'female' | 'other' | 'preferNotToSay';
  /** Centimeters. */
  height?: number;
  /** Kilograms. */
  weight?: number;
  age?: number;
  /** Units the SDK displays; `height` and `weight` stay metric. */
  measurementSystem?: 'metric' | 'imperial';
};
