import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import type { ConfigContext, ExpoConfig } from "expo/config";

import { firebaseConfigFromEnv } from "./src/config/firebase-env.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnv({ path: path.join(repoRoot, ".env") });

export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    extra: {
      ...config.extra,
      firebase: firebaseConfigFromEnv(),
    },
  }) as ExpoConfig;
