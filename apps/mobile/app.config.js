const path = require("node:path");

const { config: loadEnv } = require("dotenv");

const repoRoot = path.resolve(__dirname, "../..");
loadEnv({ path: path.join(repoRoot, ".env") });

/** iOS simulator / dev-client; also used as Android applicationId */
const NATIVE_APP_ID = "com.fantasyeconomysim.mobile";

/** @param {Readonly<Record<string, string | undefined>>} [env] */
function firebaseConfigFromEnv(env = process.env) {
  return {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  };
}

/** @param {Readonly<Record<string, string | undefined>>} [env] */
function apiBaseUrlFromEnv(env = process.env) {
  const value = env.EXPO_PUBLIC_API_URL?.trim();
  return value && value.length > 0 ? value : "http://localhost:3000";
}

/** @param {import("expo/config").ConfigContext} ctx */
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    bundleIdentifier: config.ios?.bundleIdentifier ?? NATIVE_APP_ID,
  },
  android: {
    ...config.android,
    package: config.android?.package ?? NATIVE_APP_ID,
  },
  extra: {
    ...config.extra,
    firebase: firebaseConfigFromEnv(),
    apiBaseUrl: apiBaseUrlFromEnv(),
  },
});
