import { InvalidIdTokenError } from "./id-token-verifier.js";
import type { IdTokenVerifier, VerifiedIdToken } from "./id-token-verifier.js";

const DEV_TOKEN_PREFIX = "dev:";

/** Local-only verifier: Bearer token `dev:<firebaseUid>` (when FIREBASE_AUTH_DISABLED=true). */
export function createDevIdTokenVerifier(): IdTokenVerifier {
  return {
    async verify(idToken: string): Promise<VerifiedIdToken> {
      if (!idToken.startsWith(DEV_TOKEN_PREFIX)) {
        throw new InvalidIdTokenError();
      }

      const uid = idToken.slice(DEV_TOKEN_PREFIX.length).trim();

      if (!uid) {
        throw new InvalidIdTokenError();
      }

      return { uid };
    },
  };
}
