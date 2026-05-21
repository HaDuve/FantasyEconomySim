export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

export function firebaseConfigFromEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
): FirebaseClientConfig {
  return {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  };
}
