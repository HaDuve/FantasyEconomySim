export function apiBaseUrlFromEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const value = env.EXPO_PUBLIC_API_URL?.trim();
  return value && value.length > 0 ? value : "http://localhost:3000";
}
