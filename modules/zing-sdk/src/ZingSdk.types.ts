export type ZingAuthState = 'loggedOut' | 'inProgress' | 'authenticated';

export type ZingRoute =
  | 'home'
  | 'custom_workout'
  | 'ai_assistant'
  | 'workout_plan_details'
  | 'full_schedule'
  | 'profile_settings';

export type ZingApiKeys = {
  iosApiKey: string;
  androidApiKey: string;
};

export type ZingAuthStateEvent = {
  state: ZingAuthState;
};

export type ZingSdkModuleEvents = {
  onAuthStateChanged: (event: ZingAuthStateEvent) => void;
};
